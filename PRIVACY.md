# Privacy Policy — Georgia Tech OMSCS Radar

_Last updated: May 2026_

## What we collect

**Nothing personally identifiable.** Georgia Tech OMSCS Radar runs locally in your browser and does not collect, transmit, or store any personally identifying information.

## What we store locally

The extension uses [`chrome.storage.sync`](https://developer.chrome.com/docs/extensions/reference/api/storage) to remember one preference:

- Your selected data source (currently only OMSCentral is supported)

This preference is stored in your browser only. It may sync across devices where you're signed into Chrome with the same Google account, per Chrome's standard sync behavior. We do not have access to this data.

## What we request from the network

The extension calls a single read-only endpoint at `https://backend-production-3c97.up.railway.app/api/courses` to fetch publicly available course rating data. The request includes:

- Standard browser headers (no auth, no tracking)
- No user identifier of any kind
- No information about which Georgia Tech page you're viewing

We do not log who is making these requests; the server does not associate requests with any user.

## What we don't do

- We do not use cookies
- We do not run any analytics or tracking scripts
- We do not sell, share, or rent data — there is no data to sell
- We do not communicate with any service other than our own course-rating API

## Source code

This extension is open source. You can verify all the claims above by reading the source:
https://github.com/xqetsia/omscs-radar

## Contact

Questions or concerns? Open an issue on the GitHub repo above.