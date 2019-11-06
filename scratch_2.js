const http = require('http');
const https = require('https');
const readline = require('readline');

const createSimpleServer = (port, handler) => http.createServer((request, response) => {
  const chunks = [];
  request.on('data', chunks.push.bind(chunks));
  request.on('end', () => {
    Promise.resolve(handler({request, response, body: chunks.join('')}))
      .then(() => response.finished || response.end());
  });
}).listen(port);

const csvUrl = 'https://library.ucsd.edu/dc/object/bb3859642r/_1.csv/download';
const excelHeader = 'Excel';
const adjFitHeader = 'adjusted fit';

const newApp = port => createSimpleServer(port, ({response}) => new Promise(resolve => {
  (csvUrl.startsWith('https') ? https : http).get(csvUrl, input => {
    let excelDateCol, adjFitCol, lastDate, lastValue, secondLastDate, secondLastValue;
    readline.createInterface({input}).on('line', csvLine => {
      let excelDate, adjFitValue;
      csvLine.split(',').forEach((f, i) => {
        if (f.includes(excelHeader)) excelDateCol = i;
        if (f.includes(adjFitHeader)) adjFitCol = i;
        if (i === excelDateCol) excelDate = parseFloat(f);
        if (i === adjFitCol) adjFitValue = parseFloat(f);
      });
      if (excelDate && adjFitValue && adjFitValue > 0) {
        secondLastValue = lastValue;
        lastValue = adjFitValue;
        secondLastDate = lastDate;
        lastDate = new Date((excelDate - 25569) * 24 * 60 * 60 * 1000);
      }
    }).on('close', () => {
      const slope = (lastValue - secondLastValue) / (lastDate - secondLastDate);
      const currentValueGetterExpression =
        `Number(((Date.now() - ${lastDate.getTime()}) * ${slope}) + ${lastValue})` +
        '.toLocaleString(undefined, {minimumFractionDigits: 8, maximumFractionDigits: 8})';
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Refresh', String(24 * 60 * 60));
      response.setHeader('Connection', 'close');
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Expires', '0');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Surrogate-Control', 'no-store');
      response.setHeader('X-Powered-By', 'the folly of man');
      response.end(
        '<!doctype html>\n' +
        '<html lang=en>\n' +
        '<head>\n' +
        '  <meta charset=utf-8>\n' +
        '  <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX///9qCAhXCQlJBwdqCQlKBgZEAgJbAAB9AgJ3HR2tCQm8CwvEDAzpDg7xEhIYFxcuz4idAAAAEHRSTlMAAQQYbrX1+/v6+/n79vv6T3NiHwAAAHlJREFUeAEFwUFSAzEQBDC17ZDaA///aaBIdhopAEm0FUBW0M4BK3LpvOvATr62svM+rORhtpTJyUoOmpZmrVxP+HQanFzJzS2yx853+DzwG9o5xfq5aNGeUhsXr3a2Vd1/B6/pOG1549XeyFoJOjqwC21nCmCtFQD/0PRFO+prkvUAAAAASUVORK5CYII=" />\n' +
        '  <title>Live Atmospheric CO2 Concentration Annualized Average Estimate</title>\n' +
        '  <style type="text/css">\n' +
        '    body {margin: 0;}\n' +
        '    main {\n' +
        '      position: absolute;\n' +
        '      width: 100%;\n' +
        '      text-align: center;\n' +
        '      top: 50%;\n' +
        '      transform: translateY(-50%);\n' +
        '      font-size: 144px;\n' +
        '    }\n' +
        '    footer {\n' +
        '      position: absolute;\n' +
        '      left: 0;\n' +
        '      bottom: 0;\n' +
        '    }\n' +
        '  </style>\n' +
        '  <script type="text/javascript">\n' +
        '    setInterval(function() {\n' +
        '      let value = ' + currentValueGetterExpression + ';\n' +
        '      document.getElementsByTagName("main")[0].innerText = value + " ppm";\n' +
        '    }, 197);\n' +
        '  </script>\n' +
        '</head>\n' +
        '<body>\n' +
        '<main>&ndash;</main>\n' +
        '<footer>\n' +
        `  Based on the last two monthly ${adjFitHeader} data from <a href="${csvUrl}">Keeling et al.</a>\n` +
        '  <sub>&nbsp;</sub><br>\n' +
        `  Most recent ${adjFitHeader} point dated ${lastDate}\n` +
        '  <sub>&nbsp;</sub><br>\n' +
        '  Further information on changes in atmospheric CO<sub>2</sub> concentration in this\n' +
        '  <a href="https://www.esrl.noaa.gov/gmd/ccgg/trends/history.html">NOAA visualization</a>.<br>\n' +
        '  Made for Pivotal hack day 2019 and hosted on <a href="https://run.pivotal.io">Pivotal Web Services</a>.\n' +
        '  <a href="https://github.com/nguerette/liveco2">Source code</a>\n' +
        '</footer>\n' +
        '</body>\n' +
        '</html>'
      );
      resolve();
    });
  });
}));

module.exports = {newApp};
