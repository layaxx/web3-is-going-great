import PropTypes from "prop-types";
import useGA from "../hooks/useGA";

import { getBrandEntries } from "../db/brandEntries";
import { BrandEntryPropType } from "../js/brandEntry";

import BrandTimeline from "../components/brands/BrandTimeline";

export async function getServerSideProps() {
  return {
    props: {
      entries: await getBrandEntries({ sort: "desc", column: "date" }),
    },
  };
}

export default function ForBrands({ entries }) {
  useGA();

  return <BrandTimeline entries={entries} />;
}

ForBrands.propTypes = {
  entries: PropTypes.arrayOf(BrandEntryPropType.isRequired).isRequired,
};
