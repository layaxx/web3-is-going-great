import PropTypes from "prop-types";
import { useState } from "react";

import useWindowWidth from "../../hooks/useWindowWidth";
import { BrandEntryPropType } from "../../js/brandEntry";

import Header from "../timeline/Header";
import BrandEntry from "./BrandEntry";

export default function BrandTimeline({ entries }) {
  const [sort, setSort] = useState({ key: "announcement", direction: "desc" });
  const [sortedData, setSortedData] = null;

  const windowWidth = useWindowWidth();

  const makeChangeSort = (sortKey, current) => () => {
    let direction = "desc";
    if (sortKey === sort.key && current === "fa-caret-down") {
      direction = "asc";
    }
    setSort({ key: sortKey, direction });
  };

  const makeSortButton = (sortKey) => {
    let className = "fa-sort";
    if (sort.key === sortKey) {
      if (sort.direction === "desc") {
        className = "fa-caret-down";
      } else {
        className = "fa-caret-up";
      }
    }
    return (
      <button onClick={makeChangeSort(sortKey, className)}>
        <i className={`fa-solid ${className}`} />
      </button>
    );
  };

  const renderTable = () => {
    return (
      <table className="brands-timeline">
        <thead>
          <tr>
            <th>Brand {makeSortButton("brand")}</th>
            <th>Announcement {makeSortButton("announcement")}</th>
            <th>Cancellation</th>
            <th>Category {makeSortButton("category")}</th>
            <th>Project</th>
            <th>Status {makeSortButton("status")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <BrandEntry key={entry.id} entry={entry} />
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <>
      <Header windowWidth={windowWidth} />
      <div className="timeline-page content-wrapper brands-timeline">
        {renderTable()}
      </div>
    </>
  );
}

BrandTimeline.propTypes = {
  entries: PropTypes.arrayOf(BrandEntryPropType.isRequired).isRequired,
};
