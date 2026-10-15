/*
 * ============================================================================
 *  PSG Campus Compass - Java backend (JDK only: no Maven, no Gradle, no Python)
 * ============================================================================
 *  Run:      javac -encoding UTF-8 Server.java   &&   java Server
 *            (single-file launch also works on JDK 11+:   java Server.java )
 *  Default:  http://localhost:8090            PORT=9000 java Server
 *
 *  What it does
 *  ------------
 *   1. Serves index.html (the whole site is that one file).
 *   2. REST API the site calls:
 *        POST /api/login   {email, pw}            -> {ok, created, profile|null}
 *        POST /api/save    {email, pw, profile}   -> {ok, profile}
 *        GET  /api/health                         -> {ok, students}
 *
 *  Storage: data/students.json
 *      <email>: {profile..., password: "<salt>:sha256(salt+pw)", created, updated}
 *  The demo account (student@demo.edu / student123) is seeded empty on first
 *  start: first login -> details form -> Save and submit -> colleges; the same
 *  email + password after that goes straight to the colleges (no re-register).
 *
 *  NOTE: this is a demo backend. No TLS, no rate limiting, no session tokens -
 *  it exists so the student details survive a logout instead of living only in
 *  the browser's localStorage.
 * ============================================================================
 */

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Server {

    /* ------------------------------------------------------------------ config */

    static final int PORT = Integer.parseInt(System.getenv().getOrDefault("PORT", "8090"));
    static final String ROOT = System.getProperty("user.dir");        /* the folder with Server.java */
    static final Path INDEX = Paths.get(ROOT, "index.html").normalize();
    static final Path DATA_DIR = Paths.get(ROOT, "data").normalize();
    static final Path DATA_FILE = DATA_DIR.resolve("students.json");

    static final String DEMO_EMAIL = "student@demo.edu";
    static final String DEMO_PW = "student123";
    /* The demo account starts empty on purpose: first login -> Profile details ->
       Save and submit -> colleges. Log in again with the same email + password
       and the saved details are used straight away (no second registration). */

    static final String[] PROFILE_KEYS = {"name", "phone", "marks10", "marks12",
            "town", "stay", "hostelType", "travel", "stream", "want", "degree"};
    static final int MAX_LEN = 120;

    static final Object WRITE_LOCK = new Object();

    /* ------------------------------------------------------------------ helpers */

    static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toByteArray();
    }

    static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < b.length; i++) sb.append(String.format("%02x", b[i] & 0xff));
        return sb.toString();
    }

    static String sha256hex(String s) {
        try {
            return hex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return "";
        }
    }

    static String hashPw(String pw) {
        byte[] salt = new byte[8];
        new SecureRandom().nextBytes(salt);
        String saltHex = hex(salt);
        return saltHex + ":" + sha256hex(saltHex + pw);
    }

    static boolean checkPw(String stored, String pw) {
        if (stored == null) return false;
        int i = stored.indexOf(':');
        if (i < 0) return stored.equals(pw);                  /* plain demo credential */
        return sha256hex(stored.substring(0, i) + pw).equals(stored.substring(i + 1));
    }

    static String nowIso() { return Instant.now().toString().split("\\.")[0] + "Z"; }

    static String jesc(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }

    /* flat {"a":"b","c":"d"} -> map.
       The site sends {email, pw, profile:{...}} - nested profile fields come out
       flattened, which is exactly what the save handler reads. */
    static Map<String, String> parseFlatJson(String s) {
        Map<String, String> out = new LinkedHashMap<>();
        if (s == null) return out;
        Matcher m = Pattern.compile("\"([^\"]+)\"\\s*:\\s*(\"((?:\\\\.|[^\"\\\\])*)\"|true|false|null|[-0-9.eE+]+)").matcher(s);
        while (m.find()) {
            String v = m.group(3) != null ? m.group(3).replace("\\\"", "\"").replace("\\\\", "\\")
                                          : m.group(2);
            out.put(m.group(1), v);
        }
        return out;
    }

    /* {"mail":{"k":"v",...}, ...} -> email -> fields */
    static Map<String, Map<String, String>> parseUsers(String json) {
        Map<String, Map<String, String>> out = new LinkedHashMap<>();
        if (json == null) return out;
        Matcher m = Pattern.compile("\"([^\"]+)\"\\s*:\\s*\\{([^{}]*)\\}").matcher(json);
        while (m.find()) out.put(m.group(1), parseFlatJson("{" + m.group(2) + "}"));
        return out;
    }

    /* ------------------------------------------------------------------ storage */

    static Map<String, Map<String, String>> readStudents() {
        try {
            if (Files.exists(DATA_FILE)) {
                return parseUsers(new String(Files.readAllBytes(DATA_FILE), StandardCharsets.UTF_8));
            }
        } catch (IOException ignored) {
        }
        return new LinkedHashMap<>();
    }

    static void writeStudents(Map<String, Map<String, String>> students) {
        StringBuilder sb = new StringBuilder("{\n");
        boolean first = true;
        for (Map.Entry<String, Map<String, String>> e : students.entrySet()) {
            if (!first) sb.append(",\n");
            first = false;
            sb.append(" \"").append(jesc(e.getKey())).append("\": {");
            boolean f2 = true;
            for (Map.Entry<String, String> kv : e.getValue().entrySet()) {
                if (!f2) sb.append(",");
                f2 = false;
                sb.append("\n  \"").append(jesc(kv.getKey())).append("\": \"")
                  .append(jesc(kv.getValue() == null ? "" : kv.getValue())).append("\"");
            }
            sb.append("\n }");
        }
        sb.append("\n}\n");
        try {
            synchronized (WRITE_LOCK) {
                Files.createDirectories(DATA_DIR);
                Files.write(DATA_FILE, sb.toString().getBytes(StandardCharsets.UTF_8));
            }
        } catch (IOException e) {
            System.out.println("WARN: could not write " + DATA_FILE + " - " + e);
        }
    }

    static String cleanField(String v) {
        if (v == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < v.length() && sb.length() < MAX_LEN; i++) {
            char c = v.charAt(i);
            if (c >= 0x20 && c != 0x7f) sb.append(c);
        }
        return sb.toString().trim();
    }

    static Map<String, String> cleanProfile(Map<String, String> raw) {
        Map<String, String> out = new LinkedHashMap<>();
        for (int i = 0; i < PROFILE_KEYS.length; i++) out.put(PROFILE_KEYS[i], cleanField(raw.get(PROFILE_KEYS[i])));
        return out;
    }

    static String profileJson(Map<String, String> entry) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> kv : entry.entrySet()) {
            if ("password".equals(kv.getKey())) continue;
            if (!first) sb.append(",");
            first = false;
            sb.append("\"").append(jesc(kv.getKey())).append("\":\"")
              .append(jesc(kv.getValue() == null ? "" : kv.getValue())).append("\"");
        }
        return sb.append("}").toString();
    }

    static void seed() {
        Map<String, Map<String, String>> data = readStudents();
        if (!data.containsKey(DEMO_EMAIL)) {
            Map<String, String> rec = new LinkedHashMap<>();
            rec.put("email", DEMO_EMAIL);
            rec.put("password", hashPw(DEMO_PW));
            rec.put("created", nowIso());
            rec.put("updated", nowIso());
            data.put(DEMO_EMAIL, rec);
            writeStudents(data);
            System.out.println("seeded demo account: " + DEMO_EMAIL);
        }
    }

    /* ------------------------------------------------------------------ http */

    static void send(HttpExchange ex, int status, byte[] body, String ctype) {
        try {
            Headers h = ex.getResponseHeaders();
            h.set("Content-Type", ctype);
            h.set("Cache-Control", "no-store");
            h.set("Access-Control-Allow-Origin", "*");
            h.set("Access-Control-Allow-Headers", "Content-Type");
            h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            boolean head = "HEAD".equalsIgnoreCase(ex.getRequestMethod());
            if (head || body.length == 0) {
                ex.sendResponseHeaders(status, -1);
            } else {
                ex.sendResponseHeaders(status, body.length);
                ex.getResponseBody().write(body);
            }
        } catch (IOException ignored) {
        } finally {
            ex.close();
        }
    }

    static void sendJson(HttpExchange ex, int status, String json) {
        send(ex, status, json.getBytes(StandardCharsets.UTF_8), "application/json; charset=utf-8");
    }

    static Map<String, String> bodyOf(HttpExchange ex) throws IOException {
        return parseFlatJson(new String(readAll(ex.getRequestBody()), StandardCharsets.UTF_8));
    }

    static void serveIndex(HttpExchange ex) {
        try {
            send(ex, 200, Files.readAllBytes(INDEX), "text/html; charset=utf-8");
        } catch (IOException e) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"index.html missing\"}");
        }
    }

    static void apiLogin(HttpExchange ex) throws IOException {
        Map<String, String> body = bodyOf(ex);
        String email = body.getOrDefault("email", "").trim().toLowerCase(Locale.ROOT);
        String pw = body.getOrDefault("pw", "");
        if (email.isEmpty() || pw.isEmpty()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"email and password required\"}");
            return;
        }
        Map<String, Map<String, String>> data = readStudents();
        Map<String, String> entry = data.get(email);
        if (entry == null) {                                  /* new email -> create the account */
            Map<String, String> rec = new LinkedHashMap<>();
            rec.put("email", email);
            rec.put("password", hashPw(pw));
            rec.put("created", nowIso());
            rec.put("updated", nowIso());
            data.put(email, rec);
            writeStudents(data);
            sendJson(ex, 200, "{\"ok\":true,\"created\":true,\"profile\":null}");
            return;
        }
        if (!checkPw(entry.get("password"), pw)) {
            sendJson(ex, 200, "{\"ok\":false,\"error\":\"password does not match this email\"}");
            return;
        }
        String name = entry.get("name");
        boolean filled = name != null && !name.trim().isEmpty();
        sendJson(ex, 200, "{\"ok\":true,\"created\":false,\"profile\":" + (filled ? profileJson(entry) : "null") + "}");
    }

    static void apiSave(HttpExchange ex) throws IOException {
        Map<String, String> body = bodyOf(ex);
        String email = body.getOrDefault("email", "").trim().toLowerCase(Locale.ROOT);
        String pw = body.getOrDefault("pw", "");
        Map<String, Map<String, String>> data = readStudents();
        Map<String, String> entry = data.get(email);
        if (entry == null) {
            sendJson(ex, 200, "{\"ok\":false,\"error\":\"unknown email \u2014 sign in first\"}");
            return;
        }
        if (!checkPw(entry.get("password"), pw)) {
            sendJson(ex, 200, "{\"ok\":false,\"error\":\"password does not match this email\"}");
            return;
        }
        Map<String, String> profile = cleanProfile(body);
        if (profile.get("name").isEmpty()) {
            sendJson(ex, 200, "{\"ok\":false,\"error\":\"name is required\"}");
            return;
        }
        entry.putAll(profile);
        entry.put("email", email);
        entry.put("updated", nowIso());
        data.put(email, entry);
        writeStudents(data);
        sendJson(ex, 200, "{\"ok\":true,\"profile\":" + profileJson(entry) + "}");
    }

    static void handle(HttpExchange ex) {
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod().toUpperCase(Locale.ROOT);
        try {
            if (path.equals("/") || path.equals("/index.html")) { serveIndex(ex); return; }
            if (path.equals("/favicon.ico")) { send(ex, 204, new byte[0], "image/x-icon"); return; }
            if (path.equals("/api/health")) {
                sendJson(ex, 200, "{\"ok\":true,\"students\":" + readStudents().size() + "}");
                return;
            }
            if (path.equals("/api/login") && method.equals("POST")) { apiLogin(ex); return; }
            if (path.equals("/api/save") && method.equals("POST")) { apiSave(ex); return; }
            if (method.equals("OPTIONS")) { send(ex, 204, new byte[0], "text/plain; charset=utf-8"); return; }
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not found\"}");
        } catch (Exception e) {
            sendJson(ex, 500, "{\"ok\":false,\"error\":\"" + jesc(String.valueOf(e)) + "\"}");
        }
    }

    /* ------------------------------------------------------------------ main */

    public static void main(String[] args) throws IOException {
        try {
            ServerSocket probe = new ServerSocket(PORT);
            probe.close();
        } catch (IOException portTaken) {
            System.out.println("ERROR: port " + PORT + " is already in use - an OLD server");
            System.out.println("window may still be running. Close that window (or run");
            System.out.println("  taskkill /F /IM java.exe   on Windows), then start again.");
            return;
        }

        seed();

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", PORT), 0);
        ExecutorService pool = Executors.newFixedThreadPool(16);
        server.setExecutor(pool);
        server.createContext("/", new com.sun.net.httpserver.HttpHandler() {
            public void handle(HttpExchange ex) { Server.handle(ex); }
        });
        server.start();

        System.out.println("PSG Campus Compass - Java backend");
        System.out.println("  site:  http://localhost:" + PORT);
        System.out.println("  data:  " + DATA_FILE);
        System.out.println("  demo login: " + DEMO_EMAIL + " / " + DEMO_PW);
        System.out.println("  Ctrl+C to stop.");
    }
}
