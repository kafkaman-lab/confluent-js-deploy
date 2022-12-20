var expect = require('chai').expect,
    Version = require('../../lib/index.js').Version;

describe('Version', function () {
    var rawVersion = '3.1.4-pi+rounded',
        version = new Version(rawVersion);

    it('parsed successfully', function () {
        expect(version).to.be.ok;
        expect(version).to.be.an('object');
    });

    describe('has properties', function () {
        it('build', function () {
            expect(version).to.have.property('build', 'rounded');
        });

        it('major', function () {
            expect(version).to.have.property('major', 3);
        });

        it('minor', function () {
            expect(version).to.have.property('minor', 1);
        });

        it('patch', function () {
            expect(version).to.have.property('patch', 4);
        });

        it('prerelease', function () {
            expect(version).to.have.property('prerelease', 'pi');
        });

        it('raw', function () {
            expect(version).to.have.property('raw', rawVersion);
        });

        it('string', function () {
            expect(version).to.have.property('string', '3.1.4-pi');
        });

        it('set', function () {
            expect(version.set).to.be.ok;
            expect(version.set).to.be.a('function');
        });
    });

    describe('edge cases', function () {
        it('should stringify the version instance correctly', function () {
            var v1 = new Version('0.0.0'),
                v2 = new Version('');

            expect(v1.toString()).to.equal('0.0.0');
            expect(v2.toString()).to.be.undefined; // not '', so that empty versions can be selectively pruned
        });
    });
});
