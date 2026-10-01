# Statistics

Statistics is organized into Overview, Focus, Anki and Prayer. Overview contains period totals, course breakdowns, manual entry and history. The selected period also controls Focus day/hour analysis; streaks always use all history. Prayer has its own week navigation. Anki is an explicit empty state: no Anki integration or review records exist yet.

## Focus streak

- One completed Focus session with at least 900 seconds earns its local completion date. Two independent short sessions cannot earn a day together.
- Current streak includes today when earned, otherwise consecutive days ending yesterday. Longest streak covers all recorded history.
- Duplicate qualifying sessions earn a day once. Future and invalid records are ignored.
- New timer segments share a `focusSessionId` across pause/resume, course changes and reloads. Reset, skip, mode changes and changed timer duration separate sessions. Deleting a segment recomputes the total; deleting the completion removes qualification.
- Existing completed records, including manually entered completed study sessions, qualify individually at 900 seconds. Legacy paused segments have no session identity and cannot safely be combined retroactively.
- Midnight-crossing sessions earn the completion date; day/hour analysis still splits elapsed time across hour boundaries. Calendar arithmetic handles DST and year boundaries.

Verification: `TZ=America/Toronto npm test`. UI tests use jsdom at desktop/mobile media widths; they do not verify browser layout.
