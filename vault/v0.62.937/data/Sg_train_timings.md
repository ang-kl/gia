## This is a prompt syntax comment file that will produce: sg_train_timings.json
# 20 May 2026, Morning
#
Search for Singapore MRT and LRT first and last train timings across all lines.

Sources to crawl (in priority order):
1. SBS Transit official page: https://www.sbstransit.com.sg/first-train-last-train
2. sgtrainstatus.com line pages:
   - https://sgtrainstatus.com/timing/lines/north-south-line
   - https://sgtrainstatus.com/timing/lines/east-west-line
   - https://sgtrainstatus.com/timing/lines/circle-line
   - https://sgtrainstatus.com/timing/lines/thomson-east-coast-line
   - https://sgtrainstatus.com/timing/lines/bukit-panjang-lrt

Rules:
- Do not invent or estimate any timing values.
- If a station has no data from the source, set its timing fields to null and add a "note" field explaining why.
- Flag all active service adjustments found on lta.gov.sg/content/ltagov/en/map/announcement.html.
- Store output as a single .json file with this top-level structure:
  { "metadata": { ... }, "lines": { "DTL": {...}, "NEL": {...}, ... } }
- metadata must include: description, scraped_on (YYYY-MM-DD), sources (array with name, url, operator_update_date, reliability), data_completeness_notes (array), direction_label_conventions (object), active_service_adjustments (array).
- Each line object must include: line_name, line_code, operator, source_id, directions (keyed by direction label), and within each direction a stations array with code, name, and timing fields appropriate to that source.
- Use the exact timing strings from source (e.g. "5:30am", "12:25am") - do not convert to 24-hour format.
- Terminal stations in a given direction should have null timing fields with note "terminal station in this direction".
- Validate the JSON after writing it.
