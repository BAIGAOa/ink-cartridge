ERROR [Ink-Router-Kit] Cannot close modal "_Dev-Tool_": no modal with
       that ID exists.

 src/screen/provider.tsx:541:15

 538:
 539:     case 'closeModal': {
 540:       if (!state.modals.some(m => m.id === action.id)) {
 541:         throw new Error(
 542           `[Ink-Router-Kit] Cannot close modal "${action.id}": no
 :  modal with that ID exists.`,
 543:         );
 544:       }

 - screenReducer (src/screen/provider.tsx:541:15)
 -updateReducerI (node_modules/react-reconciler/cjs/react-reconciler.deve
  pl            lopment.js:5721:17)
 -updateReduc (node_modules/react-reconciler/cjs/react-reconciler.develop
  r          ment.js:5641:14)
 -Object.useRedu (node_modules/react-reconciler/cjs/react-reconciler.deve
  er            lopment.js:18192:18)
 -process.env.NODE_ENV.exports.u (node_modules/react/cjs/react.developmen
  eReducer                      t.js:1257:34)
 - ScenarioManagementProvider (src/screen/provider.tsx:599:29)
 -Object.react_stack_bo (node_modules/react-reconciler/cjs/react-reconcil
  tom_frame            er.development.js:17596:20)
 -renderWithHo (node_modules/react-reconciler/cjs/react-reconciler.develo
  ks          pment.js:5335:22)
 -updateFunctionCom (node_modules/react-reconciler/cjs/react-reconciler.d
  onent            evelopment.js:7720:19)
 -beginWor (node_modules/react-reconciler/cjs/react-reconciler.developmen
          t.js:9277:18)
~/ink-router-kit $