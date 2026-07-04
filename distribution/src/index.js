const glob = require('glob');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const findFiles = promisify(glob);
const { md5FileSync } = require('./md5');

const versionHash = Math.random().toString(36).substring(7);
const distributionGeneratePath = './build/distribution.json';

// Dossier du cache = contenu qui doit atterrir dans Android/data/<pkg>/files du jeu.
// = le dossier "files/" du modpack Slime/AFRP. Surchargeable via la variable
// d'env AFRP_CACHE_DIR (ex: AFRP_CACHE_DIR="D:/.../Slime Modpack/files" npm run build).
const dirCache = process.env.AFRP_CACHE_DIR || './../../distributions/cache';
const dirCacheSnow = './../../distributions/cache_snow'; // optionnel (mode hiver, non utilisé par AFRP)
const dirLauncher = './../../distributions/launcher'; // optionnel (APK d'auto-MAJ)

const projectName = 'AFRP';
// NE PAS CHANGER : chemins codés en dur dans libsamp.so (voir .env du client)
const packageName = 'com.touch.mobile.dark';

// HEBERGEMENT Cloudflare R2 : remplacer par l'URL publique du bucket.
// Format bucket public managé : https://pub-<hash>.r2.dev
// (ou un domaine perso branché sur R2). Les fichiers du cache doivent être
// accessibles en GET statique à <cdnCache>/<sous-dossier>/<fichier>.
const cdnCache = 'https://VOTRE-BUCKET.r2.dev/mobile/cache';
const cdnLauncher = 'https://VOTRE-BUCKET.r2.dev/mobile/launcher';

const appVersion = '1.0.0';
const rss = 'https://VOTRE-BUCKET.r2.dev/api/launcher/news';

const filesContinue = ['settings.ini', 'gta_sa.set', 'svconfig.ini'];
const filesIgnore = ['samp_log.txt', 'crash_log.log', 'gtasatelem.set'];

//----------------

return new Promise(async () => {
	const cache = [];
	let cacheId = 1;
	const cacheSnow = [];
	let cacheSnowId = 1;
	const cacheMerge = [];
	let cacheMergeId = 1;

	// Launcher (APK d'auto-MAJ) — OPTIONNEL : on n'échoue pas s'il est absent.
	const clientPaths = await findFiles(
		`${path.resolve(dirLauncher)}/app-release.apk`
	);

	let clientCache = null;
	if (clientPaths.length > 0) {
		clientCache = {
			appVersion,
			name: `app-release.apk`,
			hash: await md5FileSync(clientPaths[0]),
			mtime: unixTimeStamp(fs.statSync(clientPaths[0]).mtime),
			bytes: fs.statSync(clientPaths[0]).size,
		};
	} else {
		console.log(
			'⚠  Pas d\'app-release.apk dans distributions/launcher — auto-MAJ désactivée.'
		);
	}

	// Cache основной
	const filePaths = await findFiles(`${path.resolve(dirCache)}/**/*`);
	for (const filePath of filePaths) {
		if (!fs.lstatSync(filePath).isDirectory()) {
			let nameFile = filePath.split('/').pop();

			if (filesIgnore.indexOf(nameFile) === -1) {
				const pathFile = filePath
					.replace(path.resolve(dirCache) + '/', '')
					.split('/');
				pathFile.pop();

				cache.push({
					id: cacheId,
					name: nameFile,
					path: pathFile.join('/'),
					bytes: [fs.statSync(filePath).size],
					gpu: getGpu(nameFile),
				});

				cacheId++;
			}
		}
	}

	// Кеш зимний
	const fileSnowPaths = await findFiles(`${path.resolve(dirCacheSnow)}/**/*`);
	for (const filePath of fileSnowPaths) {
		if (!fs.lstatSync(filePath).isDirectory()) {
			let nameFile = filePath.split('/').pop();

			if (filesIgnore.indexOf(nameFile) === -1) {
				const pathFile = filePath
					.replace(path.resolve(dirCacheSnow) + '/', '')
					.split('/');
				pathFile.pop();

				cacheSnow.push({
					id: cacheSnowId,
					name: nameFile,
					path: pathFile.join('/'),
					bytes: fs.statSync(filePath).size,
					gpu: getGpu(nameFile),
				});

				cacheSnowId++;
			}
		}
	}

	// Cache меrge
	const fileMergePaths = await findFiles(`${path.resolve(dirCache)}/**/*`);
	for (const filePath of filePaths) {
		if (!fs.lstatSync(filePath).isDirectory()) {
			let nameFile = filePath.split('/').pop();

			if (filesIgnore.indexOf(nameFile) === -1) {
				const pathFile = filePath
					.replace(path.resolve(dirCache) + '/', '')
					.split('/');
				pathFile.pop();

				for (const snow of cacheSnow) {
					if (cache[cacheMergeId - 1].name === snow.name) {
						cache[cacheMergeId - 1].bytes = [
							...cache[cacheMergeId - 1].bytes,
							snow.bytes,
						];
					}
				}

				cacheMergeId++;
			}
		}
	}

	// Cache меrge
	const cacheMode = [];
	let cacheModeId = 1;
	const fileModePaths = await findFiles(`${path.resolve(dirCache)}/**/*`);
	for (const filePath of filePaths) {
		if (!fs.lstatSync(filePath).isDirectory()) {
			let nameFile = filePath.split('/').pop();

			if (filesIgnore.indexOf(nameFile) === -1) {
				const pathFile = filePath
					.replace(path.resolve(dirCache) + '/', '')
					.split('/');
				pathFile.pop();

				for (const snow of cacheSnow) {
					if (cache[cacheModeId - 1].name === snow.name) {
						cacheMode.push(cache[cacheModeId - 1]);
					}
				}

				cacheModeId++;
			}
		}
	}

	fs.mkdirSync(path.dirname(distributionGeneratePath), { recursive: true });
	fs.writeFileSync(
		distributionGeneratePath,
		JSON.stringify(
			{
				cache,
				cacheMode,
				projectName,
				packageName,
				versionHash,
				rss,
				cdnCache,
				cdnLauncher,
				filesContinue,
				// appVersion 0.0.0 => jamais > APP_VERSION => pas d'invite d'auto-MAJ
				launcher: clientCache || {
					appVersion: '0.0.0',
					name: '',
					hash: '',
					bytes: 0,
				},
				servers: [
					{
						id: 1,
						show: true,
						version: '1.0',
						icon: 'https://VOTRE-BUCKET.r2.dev/mobile/image/afrp_icon.png',
						events: [
							{
								title: 'Bienvenue',
								style: 'blue',
							},
						],
						slot: 100,
						bonus: true,
						name: 'AFRP - Afrique RP',
						description: 'SA-MP Mobile',
						address: '51.38.205.167:24328',
						sampVersion: '0.3.7',
					},
				],
			},
			null,
			4
		)
	);

	console.log('Distribution dir: ' + distributionGeneratePath);
}).catch(error => {
	console.log('Ошибка', error);
});

function unixTimeStamp(time) {
	const date = new Date(time);
	return Math.floor(date.getTime() / 1000);
}

function getGpu(file) {
	switch (file) {
		case 'txd.dxt.toc':
		case 'txd.dxt.tmb':
		case 'txd.dxt.dat':
		case 'samp.dxt.toc':
		case 'samp.dxt.tmb':
		case 'samp.dxt.dat':
		case 'mobile.dxt.toc':
		case 'mobile.dxt.tmb':
		case 'mobile.dxt.dat':
		case 'gta3.dxt.dat':
		case 'gta3.dxt.tmb':
		case 'gta3.dxt.toc':
		case 'gta_int.dxt.toc':
		case 'gta_int.dxt.tmb':
		case 'gta_int.dxt.dat':
		case 'touch.dxt.toc':
		case 'touch.dxt.tmb':
		case 'touch.dxt.dat': {
			return 'A';
		}
		case 'txd.etc.toc':
		case 'txd.etc.tmb':
		case 'txd.etc.dat':
		case 'samp.etc.toc':
		case 'samp.etc.tmb':
		case 'samp.etc.dat':
		case 'mobile.etc.toc':
		case 'mobile.etc.tmb':
		case 'mobile.etc.dat':
		case 'gta3.etc.dat':
		case 'gta3.etc.tmb':
		case 'gta3.etc.toc':
		case 'gta_int.etc.toc':
		case 'gta_int.etc.tmb':
		case 'gta_int.etc.dat':
		case 'touch.etc.toc':
		case 'touch.etc.tmb':
		case 'touch.etc.dat': {
			return 'M';
		}
		case 'txd.pvr.toc':
		case 'txd.pvr.tmb':
		case 'txd.pvr.dat':
		case 'samp.pvr.toc':
		case 'samp.pvr.tmb':
		case 'samp.pvr.dat':
		case 'mobile.pvr.toc':
		case 'mobile.pvr.tmb':
		case 'mobile.pvr.dat':
		case 'gta3.pvr.dat':
		case 'gta3.pvr.tmb':
		case 'gta3.pvr.toc':
		case 'gta_int.pvr.toc':
		case 'gta_int.pvr.tmb':
		case 'gta_int.pvr.dat':
		case 'touch.pvr.toc':
		case 'touch.pvr.tmb':
		case 'touch.pvr.dat': {
			return 'PT';
		}
		default:
			return '';
	}
}
