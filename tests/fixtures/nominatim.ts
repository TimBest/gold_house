// Sample Nominatim response (subset of fields we use).
export const nominatimUS = [
  {
    lat: "41.5051",
    lon: "-73.9696",
    display_name:
      "123 Main Street, Beacon, Dutchess County, New York, 12508, United States",
    address: {
      country_code: "us",
    },
  },
];

export const nominatimNonUS = [
  {
    lat: "48.8566",
    lon: "2.3522",
    display_name: "Paris, France",
    address: { country_code: "fr" },
  },
];

export const nominatimEmpty: unknown[] = [];
