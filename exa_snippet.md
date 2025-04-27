import Exa from "exa-js"

const exa = new Exa("0d649348-ce46-4a7d-9e8b-e5a3fa280023");

const result = await exa.searchAndContents(
  "Flekkefjordsparebank nyheter for 2025",
  {
    text: true,
    subpages: 15,
    includeDomains: ["https://flekkefjordsparebank.no/"],
    numResults: 15
  }
)