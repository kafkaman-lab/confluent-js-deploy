const { DownloaderHelper } = require('node-downloader-helper'),
    compose = require('docker-compose'),
    os = require('os'),
    fs = require('fs'),
    path = require('path'),
    yaml = require('js-yaml'),
    { dockerCommand } = require('docker-cli-js'),
    // eslint-disable-next-line security/detect-child-process
    exec = require('child_process').exec,
    _ = require('lodash').noConflict(),
    uuid = require('uuid'),
    FILENAME = 'docker-compose.yaml',
    TEMPLATE_COMPOSE_URL = 'https://raw.githubusercontent.com/kafkaman-labs/cp-all-in-one/' +
        '7.3.0-post/cp-all-in-one/docker-compose.yml',
    SERVICES_NAMES = ['zookeeper',
        'broker',
        'schema-registry',
        'connect',
        'ksqldb-server',
        'rest-proxy',
        'control-center',
        'ksql-datagen',
        'ksqldb-cli'];

var ConfluentServices;

ConfluentServices = function ConfluentServices () {
    let newId = uuid.v4();

    _.assign(this, /** @lends ConfluentServices.prototype */ {
        createdAt: Date.now(),

        /**
         * Instance id
         */
        iid: newId,
        pathDir: os.tmpdir() + path.sep + newId + path.sep
    });
};

// eslint-disable-next-line object-shorthand
_.assign(ConfluentServices, {
    getAvaiableServices () {
        return SERVICES_NAMES;
    },
    async getServicesStatus () {
        let result = await dockerCommand('ps -a'),

            containers = result.containerList
                .filter((container) => {
                    return _.includes(SERVICES_NAMES, container.names);
                })
                .map((container) => {
                    return {
                        name: container.names,
                        id: container['container id'],
                        running: _.includes(container.status, 'Up') };
                });

        return containers;
    },
    async isContainerRunning (containerName) {
        let containers = await this.getServicesStatus();

        return containers.filter((container) => {
            return _.equals(container, containerName);
        });
    },
    getDockerComposeVersion () {
        return new Promise((resolve, reject) => {
            exec('docker-compose --version', function (error, stdout, stderr) {
                if (error) {
                    reject(error);
                }
                if (stderr) {
                    reject(stderr);
                }
                resolve(stdout);
            });
        });
    },
    getDockerVersion () {
        return dockerCommand('--version');
    },
    async isDockerInstalled () {
        let res = await this.getDockerVersion();

        return _.isObject(res) && _.has(res, 'raw') && _.includes(res.raw, 'Docker version');
    },
    async isDockerComposeInstalled () {
        let version = await this.getDockerComposeVersion();

        return _.isString(version) && _.includes(version, 'Docker Compose version');
    },
    startContainer (containerId) {
        return dockerCommand('start ' + containerId);
    },
    stopContainer (containerId) {
        return dockerCommand('stop ' + containerId);
    },
    removeContainer (containerId) {
        return dockerCommand('rm -f ' + containerId);
    }
});


_.assign(ConfluentServices.prototype, {
    clearTempData () {
        try {
            fs.unlinkSync(this.pathDir + FILENAME);

            return true;
        }
        catch (err) {
            console.error(err);

            return false;
        }
    },
    runDockerCompose (progressCallback) {
        return compose.upAll({ cwd: this.pathDir, log: true,
            callback: progressCallback });
    },
    getLastDockerComposeVersion () {
        let self = this;

        if (!fs.existsSync(self.pathDir)) {
            fs.mkdirSync(self.pathDir);
        }

        return new Promise((resolve, reject) => {
            const download = new DownloaderHelper(TEMPLATE_COMPOSE_URL, self.pathDir, { fileName: FILENAME });

            download.on('end', () => {
                console.info('Download Completed to :' + self.pathDir + FILENAME);
                resolve(self.pathDir + FILENAME);
            });
            download.on('error', (err) => { reject(err); });

            download.start();
        });
    },
    excludeServiceFromDockerComposeFile (selectedServices) {
        let self = this;

        _.forEach(SERVICES_NAMES, (avaiableService) => {
            if (!_.includes(selectedServices, avaiableService)) {
                let doc = yaml.load(fs.readFileSync(self.pathDir + FILENAME, 'utf-8'));

                delete doc.services[avaiableService];
                fs.writeFileSync(self.pathDir + FILENAME, yaml.dump(doc));
            }
        });
    },
    createServices (selectedServices, progressCallback) {
        let self = this;

        return new Promise((resolve, reject) => {
            self.getLastDockerComposeVersion()
                .then(function () {
                    self.excludeServiceFromDockerComposeFile(selectedServices);
                    self.runDockerCompose(progressCallback)
                        .then(() => { resolve(); },
                            (err) => { reject(err.message); });
                })
                .catch(function (ddcError) {
                    reject(ddcError);
                });
        });
    },
    startServices (selectedServices, progressCallback) {
        return new Promise((resolve) => {
            ConfluentServices.getServicesStatus().then(function (services) {
                _.forEach(services, (service) => {
                    if (_.includes(selectedServices, service.name)) {
                        ConfluentServices.startContainer(service.id);
                        progressCallback('\nService  ' + service.name + ' started.');
                    }
                });
                resolve();
            });
        });
    },
    stopServices (selectedServices, progressCallback) {
        return new Promise((resolve) => {
            ConfluentServices.getServicesStatus().then(function (services) {
                _.forEach(services, (service) => {
                    if (_.includes(selectedServices, service.name)) {
                        ConfluentServices.stopContainer(service.id);
                        progressCallback('\nService  ' + service.name + ' stoped.');
                    }
                });
                resolve();
            });
        });
    },
    removeServices (selectedServices, progressCallback) {
        return new Promise((resolve) => {
            ConfluentServices.getServicesStatus().then(function (services) {
                _.forEach(services, (service) => {
                    if (_.includes(selectedServices, service.name)) {
                        ConfluentServices.removeContainer(service.id);
                        progressCallback('\nService  ' + service.name + ' removed.');
                    }
                });
                resolve();
            });
        });
    }
});


module.exports = {
    ConfluentServices
};
