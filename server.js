const http = require('http');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const mangaRoot = path.join(projectRoot, 'deathNote-manga');
const port = Number(process.env.PORT) || 4173;
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const contentTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.avif': 'image/avif',
	'.svg': 'image/svg+xml'
};

function naturalCompare(left, right) {
	return left.localeCompare(right, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

async function collectImages(directory) {
	const entries = await fs.promises.readdir(directory, { withFileTypes: true });
	entries.sort((left, right) => naturalCompare(left.name, right.name));
	const images = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.'))
			continue;

		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			images.push(...await collectImages(absolutePath));
		} else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
			images.push(absolutePath);
		}
	}

	return images;
}

async function getCatalog() {
	const entries = await fs.promises.readdir(mangaRoot, { withFileTypes: true });
	const volumeFolders = entries
		.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
		.sort((left, right) => naturalCompare(left.name, right.name));
	const volumes = [];

	for (const folder of volumeFolders) {
		const absoluteFolder = path.join(mangaRoot, folder.name);
		const imagePaths = await collectImages(absoluteFolder);
		if (imagePaths.length === 0)
			continue;

		const sortedPaths = imagePaths.sort((left, right) => naturalCompare(path.relative(absoluteFolder, left), path.relative(absoluteFolder, right)));
		const coverIndex = sortedPaths.findIndex(imagePath => /(?:^|[/\\])[^/\\]*(?:capa|cover)[^/\\]*$/i.test(imagePath));
		const coverPath = coverIndex >= 0 ? sortedPaths.splice(coverIndex, 1)[0] : sortedPaths[0];
		if (coverIndex >= 0)
			sortedPaths.unshift(coverPath);

		const volumeNumber = folder.name.match(/volume\s*0*(\d+)/i);
		const title = volumeNumber
			? 'Death Note — Volume ' + String(Number(volumeNumber[1])).padStart(2, '0')
			: folder.name;
		const toProjectPath = filePath => path.relative(projectRoot, filePath).split(path.sep).join('/');

		volumes.push({
			id: folder.name,
			title,
			pageCount: sortedPaths.length,
			cover: toProjectPath(coverPath),
			pages: sortedPaths.map(toProjectPath)
		});
	}

	return volumes;
}

function sendJson(response, statusCode, value) {
	response.writeHead(statusCode, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
		'X-Content-Type-Options': 'nosniff'
	});
	response.end(JSON.stringify(value));
}

function resolveStaticPath(urlPath) {
	let decodedPath;
	try {
		decodedPath = decodeURIComponent(urlPath);
	} catch (error) {
		return null;
	}

	if (decodedPath.split('/').some(segment => segment.startsWith('.')))
		return null;

	const absolutePath = path.resolve(projectRoot, '.' + decodedPath);
	if (absolutePath !== projectRoot && !absolutePath.startsWith(projectRoot + path.sep))
		return null;
	return absolutePath;
}

const server = http.createServer(async (request, response) => {
	const requestUrl = new URL(request.url, 'http://127.0.0.1');
	if (requestUrl.pathname === '/api/manga') {
		try {
			sendJson(response, 200, await getCatalog());
		} catch (error) {
			console.error('Não foi possível montar o catálogo:', error.message);
			sendJson(response, 500, { error: 'Não foi possível ler a pasta deathNote-manga.' });
		}
		return;
	}

	const filePath = resolveStaticPath(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
	if (!filePath) {
		response.writeHead(400);
		response.end('Caminho inválido.');
		return;
	}

	fs.promises.stat(filePath).then(stat => {
		if (!stat.isFile()) {
			response.writeHead(404);
			response.end('Arquivo não encontrado.');
			return;
		}

		response.writeHead(200, {
			'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
			'Content-Length': stat.size,
			'X-Content-Type-Options': 'nosniff'
		});
		fs.createReadStream(filePath).pipe(response);
	}).catch(() => {
		response.writeHead(404);
		response.end('Arquivo não encontrado.');
	});
});

server.listen(port, '127.0.0.1', () => {
	console.log('Leitor de mangá disponível em http://127.0.0.1:' + port);
});
