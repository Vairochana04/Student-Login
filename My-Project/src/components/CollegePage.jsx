import Markup from './Markup.jsx';
import { viewDetail, S } from '../portal.js';
import Overview from './Overview.jsx';
import Courses from './Courses.jsx';
import Fees from './Fees.jsx';
import Placements from './Placements.jsx';
import Location from './Location.jsx';
import Reviews from './Reviews.jsx';
import QA from './QA.jsx';
const pages = {overview:Overview,courses:Courses,fees:Fees,placements:Placements,location:Location,reviews:Reviews,qa:QA};
export default function CollegePage({college}) {
 const Content = pages[S.tab] || Overview;
 return <Markup html={viewDetail(college)} content={<Content college={college} />} />;
}
