import Markup from './Markup.jsx';
import { tabFees, S } from '../portal.js';
export default function Fees({ college } ) { return <Markup html={tabFees(college)} />; }
