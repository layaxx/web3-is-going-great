type Filter = {
  theme: string[];
  tech?: string[];
  blockchain?: string[];
  sort?: string;
};

type Image = {
  src: string;
  alt: string;
  caption?: string;
  link?: string;
  class?: string;
  isLogo: boolean;
};

type Link = {
  linkText: string;
  href: string;
  extraText?: string;
};

export type Entry = {
  id: string;
  readableId: string;
  title: string;
  body: string;
  date: string;
  filters: Filter;
  links?: Link[];
  image?: Image;
  color?: string;
  faicon?: string;
  icon?: string;
  scamTotal?: number;
  dateString?: string;
  tweetId?: string;
  collection?: string[];
};

export interface RssEntry extends Entry {
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AlgoliaEntry extends Entry {
  objectID: string;
}

export type ResizeResult = {
  size: number;
  success: boolean;
};

type BrandEventLinks = {
  pressRelease?: string;
  instagram?: string;
  twitter?: string;
};

type BrandEvent = {
  date: string;
  links: BrandEventLinks;
};

type AmountAtTime = {
  amount: number;
  date: string;
};

export type BrandEntryType = {
  name: string;
  id: string;
  readableId: string;
  projectDescription?: string;
  description?: string;
  tags?: string[];
  partner?: string;
  announcement?: BrandEvent;
  release?: BrandEvent;
  cancellation?: BrandEvent;
  otherLinks?: Link[];
  mintPrice?: string | number;
  floor?: AmountAtTime;
  volumeSold?: AmountAtTime;
  officialLink?: string;
  status: string;
  image?: Image;
};
