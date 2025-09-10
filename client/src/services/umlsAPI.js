// src/services/umlsApi.js

const UMLS_BASE_URL = 'https://uts-ws.nlm.nih.gov';
const UMLS_VERSION = "current";
const UMLS_SABS = "NCI";
const UMLS_STYPE = "words";
const UMLS_API_KEY = process.env.REACT_APP_UMLS_API_KEY

export const fetchCuiFromUMLS = async (sourceValue) => {
  try {
    const params = new URLSearchParams({
      string: sourceValue,
      searchType: UMLS_STYPE,
      rootSource: UMLS_SABS,
      pageNumber: "1",
      apiKey: UMLS_API_KEY,
    });

    const response = await fetch(`${UMLS_BASE_URL}/search/${UMLS_VERSION}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`UMLS API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data?.result?.results || [];

    // return first 10 results with name + cui
    return results.slice(0, 10).map(r => ({
      cui: r.ui,
      name: r.name,
    }));
  } catch (err) {
    console.error("Error fetching CUI from UMLS:", err);
    throw err;
  }
};
