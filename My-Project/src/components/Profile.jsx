import Markup from './Markup.jsx';
import { viewDetails, S } from '../portal.js';
export default function Profile({ college } ) { return <Markup html={viewDetails()} />; }
