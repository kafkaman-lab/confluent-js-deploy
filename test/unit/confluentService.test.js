const expect = require('chai').expect,
    ConfluentServices = require('../../lib/index.js').ConfluentServices,
    fs = require('fs');

describe('Confluent Service tests', function () {
    describe('Download docker-compose file', function () {
        it('should download compose-file from repository', async function () {
            var result = new ConfluentServices().getLastDockerComposeVersion();

            expect(result).to.be.an('Promise');

            let pathComposeFile = await result;

            expect(fs.existsSync(pathComposeFile)).to.equal(true);
        });
    });
});
