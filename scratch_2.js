const http = require('http');
const readline = require('readline');

const createSimpleServer = (port, handler) => http.createServer((request, response) => {
  const chunks = [];
  request.on('data', chunks.push.bind(chunks));
  request.on('end', () => {
    handler({request, response, body: chunks.join('')}).then(() => response.end());
  });
}).listen(port);

const csvUrl = 'http://scrippsco2.ucsd.edu/assets/data/atmospheric/stations/in_situ_co2/monthly/monthly_in_situ_co2_mlo.csv';
const excelHeader = 'Excel';
const adjFitHeader = 'adjusted fit';

const newApp = port => createSimpleServer(port, ({response}) => new Promise(resolve => {
  http.get(csvUrl, input => {
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
      const currentValueGetterCode = `Number(((Date.now() - ${lastDate.getTime()}) * ${slope}) + ${lastValue})` +
        '.toLocaleString(undefined, {minimumFractionDigits: 8, maximumFractionDigits: 8})';
      response.setHeader('content-type', 'text/html');
      response.write(
        '<!doctype html>\n' +
        '<html lang=en>\n' +
        '<head>\n' +
        '  <meta charset=utf-8>\n' +
        '  <title>Live Atmospheric CO2 Concentration Annualized Average Estimate</title>\n' +
        '  <style type="text/css">\n' +
        '    p {\n' +
        '      position: absolute;\n' +
        '      margin: 0;\n' +
        '      width: 100%;\n' +
        '      text-align: center;\n' +
        '      top: 50%;\n' +
        '      transform: translateY(-50%);\n' +
        '      font-size: 144px;\n' +
        '    }\n' +
        '    div {\n' +
        '      position: absolute;\n' +
        '      left: 0;\n' +
        '      top: 100%;\n' +
        '      transform: translateY(-100%);\n' +
        '    }\n' +
        '  </style>\n' +
        '  <script type="text/javascript">\n' +
        '    setInterval(function() {\n' +
        '      let value = ' + currentValueGetterCode + ';\n' +
        '      document.getElementsByTagName("p")[0].innerText = value + " ppm";\n' +
        '    }, 197);\n' +
        '  </script>\n' +
        '</head>\n' +
        '<body>\n' +
        '<p>&ndash;</p>\n' +
        `<div>Based on the last two monthly ${adjFitHeader} data from <a href="${csvUrl}">Keeling et al.</a><br>\n` +
        '  Further information on changes in atmospheric CO<sub>2</sub> concentration in this\n' +
        '  <a href="https://www.esrl.noaa.gov/gmd/ccgg/trends/history.html">NOAA visualization</a>.<br>' +
        '  Made for Pivotal hack day 2019.\n' +
        '</div>\n' +
        '</body>\n' +
        '</html>'
      );
      resolve();
    });
  });
}));

module.exports = {newApp};
