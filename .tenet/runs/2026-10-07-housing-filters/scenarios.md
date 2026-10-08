# Acceptance scenarios

## Success
1. Initial360px/1280px app uses apartment default. No complexScales request until active scale filter chosen; type choice villa and all update source copy/results. No offscreen controls or page overflow.
2. Fixtures A(99 households,2 buildings), B(100,2), C(250,1), D(unknown,1), E(150,unknown), F(both unknown), V(villa). OR only shows A,C,D plusV; exclude shows B plusV; unknown shows E,F plusV; all restores A-F,V. Household criterion only A, buildings criterion C,D. Invalid counts unknown.
3. Lazy scale lookup shows N/M progress, terminal statuses with provenance; pending not classified unknown. Failure offers retry/all; retry resolves only failures; region switch ignores old results. Cards/count/map agree after changes.
4. Server ambiguous name, substring-only, neighborhood/parcel mismatch produce no counts. Same valid identity under new caller id uses one lookup and correct ids. Batch max12 validation rejects malformed/oversize input. 5s fetch timeout and25s batch bound enforced with deterministic clock; concurrency<=3.
5. Budget/price/area/sort remain client-side; compare selected records still opens. Villa-only scale control disabled/reset. No financial input values sent in scale API.
6. Coverage audit records known both/partial/no-match/error for bounded sample with source/date; documentation does not promise all small apartments identified or persistent cache.

## Anti-scenarios
1. Unknown/0/invalid count is treated as large apartment and passes exclude.
2. 100 households qualifies as <100, or 250 households and1 building fails OR.
3. Fuzzy first match attaches another complex counts; cached caller ids leak to different requests.
4. Default first search waits for all apartment metadata; unbounded fanout/queue or endless retries.
5. Stale region response changes new-region results; pending labeled no data; error silently becomes normal empty result.
6. Grouped villa data claimed separately classified, invented data/ranking or secrets/financial data transmitted.
