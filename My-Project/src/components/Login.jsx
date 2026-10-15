import Markup from './Markup.jsx';
import { viewLogin, S } from '../portal.js';
export default function Login({ college } ) { return <Markup html={viewLogin(S.alert || '')} />; }
