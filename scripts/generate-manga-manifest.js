const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const mangaRoot = path.join(projectRoot, 'deathNote-manga');
const outputPath = path.join(projectRoot, 'manga-manifest.json');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

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

async function generateManifest() {
	const entries = await fs.promises.readdir(mangaRoot, { withFileTypes: true });
	const folders = entries
		.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
		.sort((left, right) => naturalCompare(left.name, right.name));
	const catalog = [];

	for (const folder of folders) {
		const absoluteFolder = path.join(mangaRoot, folder.name);
		const imagePaths = await collectImages(absoluteFolder);
		if (imagePaths.length === 0)
			continue;

		const sortedPaths = imagePaths.sort((left, right) => naturalCompare(
			path.relative(absoluteFolder, left),
			path.relative(absoluteFolder, right)
		));
		const coverIndex = sortedPaths.findIndex(imagePath => /(?:^|[/\\])[^/\\]*(?:capa|cover)[^/\\]*$/i.test(imagePath));
		const coverPath = coverIndex >= 0 ? sortedPaths.splice(coverIndex, 1)[0] : sortedPaths[0];
		if (coverIndex >= 0)
			sortedPaths.unshift(coverPath);

		const volumeNumber = folder.name.match(/volume\s*0*(\d+)/i);
		const title = volumeNumber
			? 'Death Note — Volume ' + String(Number(volumeNumber[1])).padStart(2, '0')
			: folder.name;
		const relativePath = filePath => path.relative(projectRoot, filePath).split(path.sep).join('/');

		catalog.push({
			id: folder.name,
			title,
			pageCount: sortedPaths.length,
			cover: relativePath(coverPath),
			pages: sortedPaths.map(relativePath)
		});
	}

	await fs.promises.writeFile(outputPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
	console.log('Catálogo gerado: ' + catalog.length + ' volumes em ' + path.relative(projectRoot, outputPath));
}

generateManifest().catch(error => {
	console.error('Não foi possível gerar o catálogo:', error.message);
	process.exitCode = 1;
});
