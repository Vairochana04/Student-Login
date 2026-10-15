import Markup from './Markup.jsx';
import { tabPlacements, S } from '../portal.js';
export default function Placements({ college } ) { return <Markup html={tabPlacements(college)} />; }
