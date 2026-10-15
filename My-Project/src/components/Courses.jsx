import Markup from './Markup.jsx';
import { tabCourses, S } from '../portal.js';
export default function Courses({ college } ) { return <Markup html={tabCourses(college)} />; }
