import Markup from './Markup.jsx';
import { tabReviews, S } from '../portal.js';
export default function Reviews({ college } ) { return <Markup html={tabReviews(college)} />; }
