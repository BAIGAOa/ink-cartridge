/**
 * Default weights of the built-in pipeline processors, keyed by processor id.
 *
 * Higher weight runs earlier; equal weights are ordered by registration time
 * (`createAt`). The weights descend from `modal` (the barrier that must run
 * first) to `screen-stack` in steps of 1000, leaving headroom for custom
 * processors to slot between the built-ins — e.g. a processor that must run
 * before the modal barrier can use `builtinProcessorWeights.modal + 1`.
 */
export const builtinProcessorWeights = {
	modal: 8000,
	"composition-overlay": 7000,
	"global-sequence-overlay": 6000,
	"global-key-overlay": 5000,
	layer: 4000,
	"composition-screen": 3000,
	"global-sequence-screen": 2000,
	"global-key-screen": 1000,
	"screen-stack": 0,
} as const;
