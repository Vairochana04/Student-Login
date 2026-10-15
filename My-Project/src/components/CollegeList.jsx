import Markup from './Markup.jsx';
import { viewList, S } from '../portal.js';
export default function CollegeList({ college } ) { return <Markup html={viewList()} />; }
