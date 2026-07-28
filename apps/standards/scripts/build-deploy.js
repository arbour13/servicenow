/* Standards is deployable: false in deploy.manifest.js — Update Set XML packaging was removed
   from the shared packager. Use the Deployment Packager console + Now SDK bridge for Fluent
   deploys when this app is made deployable again.

   node scripts/build-deploy.js
*/
'use strict';

console.error(
  'Standards XML packaging was removed. This app has deployable: false.\n' +
  'When ready to ship, set deployable and use:\n' +
  '  node tools/sn-deployment-packager/sdk-bridge.js\n' +
  '  open /tools/sn-deployment-packager/ → Deploy with Now SDK\n' +
  'Or CLI: node tools/sn-deployment-packager/build.js <app-folder>'
);
process.exit(1);
