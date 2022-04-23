import PropTypes from "prop-types";
import { LinkFieldPropType } from "./entry";

const BrandEventPropTypes = PropTypes.shape({
  date: PropTypes.string.isRequired,
  links: PropTypes.shape({
    pressRelease: PropTypes.string,
    twitter: PropTypes.string,
    instagram: PropTypes.string,
  }),
});

const AmountAtTimePropType = PropTypes.shape({
  date: PropTypes.string,
  amount: PropTypes.number,
});

export const BrandEntryPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  readableId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  projectDescription: PropTypes.string,
  description: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  partner: PropTypes.string,
  announcement: BrandEventPropTypes,
  release: BrandEventPropTypes,
  cancellation: BrandEventPropTypes,
  otherLinks: PropTypes.arrayOf(LinkFieldPropType),
  mintPrice: PropTypes.oneOfType([
    PropTypes.oneOf(["variable"]),
    PropTypes.number,
  ]),
  floor: AmountAtTimePropType,
  volumeSold: AmountAtTimePropType,
  officialLink: PropTypes.string,
  status: PropTypes.string.isRequired,
  image: PropTypes.shape({
    src: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
    link: PropTypes.string,
    caption: PropTypes.string,
    class: PropTypes.string,
  }),
});
