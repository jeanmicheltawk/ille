import { ServiceItem } from './models.types';

/** One promo + heading + offerings stack on the public services page. */
export interface ServiceSectionBlock {
  promos: ServiceItem[];
  heading: ServiceItem | null;
  offerings: ServiceItem[];
}

/**
 * Groups ordered service items into repeatable blocks.
 * A new block starts when a promo or services_heading appears after
 * a heading or offerings are already present in the current block.
 */
export function buildServiceSections(items: ServiceItem[]): ServiceSectionBlock[] {
  const sections: ServiceSectionBlock[] = [];
  let current: ServiceSectionBlock = emptySection();

  const flush = () => {
    if (current.promos.length || current.heading || current.offerings.length) {
      sections.push(current);
    }
    current = emptySection();
  };

  for (const item of items) {
    if (item.type === 'promo') {
      if (current.heading || current.offerings.length) flush();
      current.promos.push(item);
      continue;
    }
    if (item.type === 'services_heading') {
      if (current.heading || current.offerings.length) flush();
      current.heading = item;
      continue;
    }
    if (item.type === 'offering') {
      current.offerings.push(item);
    }
  }

  flush();
  return sections;
}

function emptySection(): ServiceSectionBlock {
  return { promos: [], heading: null, offerings: [] };
}
