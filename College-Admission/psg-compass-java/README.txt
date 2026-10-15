PSG CAMPUS COMPASS — full project (JAVA backend)
================================================
Standalone site · 16 campuses (PSG 10 + Karpagam 6) · own login
Build: v4.1 · group pages


WHAT IS INSIDE
--------------
  Server.java           Java backend — JDK mattum (Maven / Gradle illa, Python illa)
  index.html            the whole site (one file — HTML + CSS + JS)
  START-WINDOWS.bat     Windows: double-click -> compile + server + browser
  START-MAC-LINUX.sh    Mac / Linux: ./START-MAC-LINUX.sh
  START-HERE.txt        quick start (30 seconds)
  README.txt            this file

  (data/ folder first run-la thana create aagum — student details anga save aagum)


RUN PANNA
---------
  1) JDK install (once) — JDK 11 illa mela (17 / 21 best):
        Windows : winget install Microsoft.OpenJDK.21
        macOS   : brew install openjdk@21
        Ubuntu  : sudo apt install openjdk-21-jdk
        illa    : https://adoptium.net  ->  Temurin 21 (JDK)

  2) Start:
        Windows  : START-WINDOWS.bat  -> double-click
        Mac/Linux: ./START-MAC-LINUX.sh
        Manually : javac -encoding UTF-8 Server.java   &&   java Server

  3) Browser:  http://localhost:8090
        Vera port venum-na:   PORT=9000 java Server

  Server start aagum bodhu demo account thana seed aagum
  (student@demo.edu / student123). First run la vera edhuvum panna vendaam.

  Server illama venum-na: index.html-a double-click pannunga — site work aagum,
  aana details antha device la mattum save aagum (localStorage).


DEMO LOGIN
----------
   email    : student@demo.edu
   password : student123

   First time login  ->  details form varum
                         (name, phone, 10 & 12 marks, location, hostel / day scholar)
   Save and submit   ->  colleges display aagum

   Adhe email + password next time podunga:
   ->  details form varadhu, colleges DIRECT-a varum (thirumba register illa)


FLOW (student paakura order)
----------------------------
  1. Login  ->  Groups page:
        [PSG Institutions]       10 campuses
        [Karpagam Institutions]   6 campuses
  2. Oru group card-a touch pannaa  ->  antha group-oda campuses list
        (unga 12th % + place vachu sort: chance -> near your place -> rating)
  3. Campus-a open pannaa  6 tabs:
        Overview / Courses & cutoff / Placements / Location / Reviews / Q & A
  4. Search bar la course peru type pannaa (nursing, MBA, CSE)
        ->  rendu group-layum search aagum (group headings-oda)
  5. ★ Saved chip  ->  neenga save panna campuses mattum
  6. Header ✎  ->  details edit (12th %, hostel)   |   ⇋  ->  sign out


CAMPUSES (16)
-------------
PSG (10)      : PSG Tech, PSG iTech, PSG CAS, PSG IM, PSG IMSR, PSG Nursing,
                PSG Pharmacy, PSG Physiotherapy, PSG Polytechnic, PSG IAS
Karpagam (6)  : KAHE, KCE, KIT, Karpagam Faculty of Medical Sciences,
                Karpagam College of Pharmacy, Karpagam College of Nursing


BACKEND (Server.java)
---------------------
   POST /api/login    {email, pw}            -> {ok, created, profile|null}
                       (pudhu email = account create aagum)
   POST /api/save     {email, pw, profile}   -> {ok, profile}
   GET  /api/health                          -> {ok, students}

   Storage: data/students.json
   Password: salt + sha256 hash ("<salt>:<sha256(salt+pw)>") — plain text illa
   Server: JDK-oda built-in com.sun.net.httpserver — extra library illa
   NOTE: idhu demo backend — TLS illa, rate limit illa, session token illa.
         Details logout panna pinnaum irukkanum-nu mattum irukku.


NOTE (mukkiyam)
---------------
   Ratings, fees, cutoffs, seats, placements, reviews, Q & A —
   ellaam SAMPLE (indicative) values only. Demo-ku mattum.
   Real admission-ku official college website-a paarunga.
