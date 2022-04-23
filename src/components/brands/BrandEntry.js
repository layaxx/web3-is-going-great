import { BrandEntryPropType } from "../../js/brandEntry";
import { humanizeDate } from "../../js/utilities";

const LINK_ICONS = {
  pressRelease: {
    iconClass: "fa-solid fa-bullhorn",
    title: "Press release",
  },
  twitter: { iconClass: "fa-brands fa-twitter", title: "Tweet" },
  instagram: { iconClass: "fa-brands fa-instagram", title: "Instagram post" },
};

export default function BrandEntry({ entry }) {
  const renderEventLinks = (eventType) => {
    const links = [];
    ["pressRelease", "twitter", "instagram"].forEach((type) => {
      if (type in entry[eventType]) {
        links.push(
          <a href={entry[eventType][type]} title={LINK_ICONS[type].title}>
            <i className={LINK_ICONS[type].iconClass} aria-hidden={true} />
            <span className="sr-only">{LINK_ICONS[type].title}</span>
          </a>
        );
      }
    });
    return links;
  };

  const renderEventCell = (eventType) => {
    if (eventType in entry) {
      const links = renderEventLinks(eventType);
      return (
        <td className="event">
          <time dateTime={entry[eventType].date}>
            {humanizeDate(entry[eventType].date)}
          </time>
          {links.length && <span className="links">{links}</span>}
        </td>
      );
    } else if (eventType === "cancellation") {
      return <td>-</td>;
    }
    return <td></td>;
  };

  return (
    <>
      <tr className="expanded primary">
        <td>
          <span dangerouslySetInnerHTML={{ __html: entry.name }} />
        </td>
        {renderEventCell("announcement")}
        {renderEventCell("cancellation")}
        <td>{entry.tags.join(", ")}</td>
        <td>{entry.projectDescription}</td>
        <td>{entry.status}</td>
      </tr>
      <tr className="details expanded">
        <td colSpan={5}>Mint price: variable</td>
      </tr>
    </>
  );
}

BrandEntry.propTypes = {
  entry: BrandEntryPropType.isRequired,
};
