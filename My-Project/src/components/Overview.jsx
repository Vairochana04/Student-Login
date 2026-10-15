import Markup from './Markup.jsx';
import { tabOverview, S } from '../portal.js';
export default function Overview({ college } ) { return <Markup html={tabOverview(college)} />; }
