/*
 * Magazine sample
*/

// function addPage(page, book) {

// 	var id, pages = book.turn('pages');

// 	// Create a new element for this page
// 	var element = $('<div />', {});

// 	// Add the page to the flipbook
// 	if (book.turn('addPage', element, page)) {

// 		// Add the initial HTML
// 		// It will contain a loader indicator and a gradient
// 		element.html('<div class="gradient"></div><div class="loader"></div>');

// 		// Load the page
// 		loadPage(page, element);
// 	}

// }

function addPage(page, book) {

	var id, pages = book.turn('pages');

	if (!book.turn('hasPage', page)) {

		var element = $('<div />',
			{
				// 'class': 'own-size',
				css: ({ width: '100%', height: '100%' })
				// css: { width: 460, height: 460 }
			}).
			html('<div class="loader"></div>');

		if (book.turn('addPage', element, page)) {
			loadPage(page, element);
		}

	}
}


// function loadPage(page, pageElement) {

// 	// Create an image element

// 	var img = $('<img />');

// 	img.mousedown(function(e) {
// 		e.preventDefault();
// 	});

// 	img.load(function() {

// 		// Set the size
// 		$(this).css({width: '100%', height: '100%'});

// 		// Add the image to the page after loaded

// 		$(this).appendTo(pageElement);

// 		// Remove the loader indicator

// 		pageElement.find('.loader').remove();
// 	});

// 	// Load the page

// 	img.attr('src', 'pages/' +  page + '.jpg');

// 	loadRegions(page, pageElement);

// }

function loadPage(page, pageElement) {

	pageElement.empty();
	var relativePath = window.currentManga && window.currentManga.pages[page - 1];

	if (!relativePath) {
		pageElement.text('Esta página não está disponível.');
		return;
	}

	var image = $('<img />', {
		'class': 'manga-page',
		'alt': 'Página ' + page
	});

	image.on('error', function () {
		pageElement.text('Não foi possível carregar esta página.');
	});

	image.attr('src', toAssetUrl(relativePath));
	image.appendTo(pageElement);

}

function loadScript() {
	// Verifica se já existe o script dentro da div
	if ($('.atividade').find('script[src="js/script.js"]').length > 0) {
		// console.log('Script já carregado. Nada a fazer.');
		return;
	}

	// console.log('Nenhum script encontrado. Carregando novo script.');

	// Cria e insere a nova tag script
	var scriptTag = $('<script />', {
		type: 'text/javascript',
		src: 'js/script.js'
	});

	scriptTag.appendTo('.atividade');
}

// Zoom in / Zoom out

function zoomTo(event) {
	setTimeout(function () {
		if ($('.magazine-viewport').data().regionClicked) {
			$('.magazine-viewport').data().regionClicked = false;
		} else {
			if ($('.magazine-viewport').zoom('value') == 1) {
				$('.magazine-viewport').zoom('zoomIn', event);
			} else {
				$('.magazine-viewport').zoom('zoomOut');
			}
		}
	}, 1);

}

// Load regions

function loadRegions(page, element) {

	$.getJSON('pages/' + page + '-regions.json').
		done(function (data) {

			$.each(data, function (key, region) {
				addRegion(region, element);
			});
		});
}

// Add region

function addRegion(region, pageElement) {

	var reg = $('<div />', { 'class': 'region  ' + region['class'] }),
		options = $('.magazine').turn('options'),
		pageWidth = options.width / 2,
		pageHeight = options.height;

	reg.css({
		top: Math.round(region.y / pageHeight * 100) + '%',
		left: Math.round(region.x / pageWidth * 100) + '%',
		width: Math.round(region.width / pageWidth * 100) + '%',
		height: Math.round(region.height / pageHeight * 100) + '%'
	}).attr('region-data', $.param(region.data || ''));


	reg.appendTo(pageElement);
}

// Process click on a region

function regionClick(event) {

	var region = $(event.target);

	if (region.hasClass('region')) {

		$('.magazine-viewport').data().regionClicked = true;

		setTimeout(function () {
			$('.magazine-viewport').data().regionClicked = false;
		}, 100);

		var regionType = $.trim(region.attr('class').replace('region', ''));

		return processRegion(region, regionType);

	}

}

// Process the data of every region

function processRegion(region, regionType) {

	data = decodeParams(region.attr('region-data'));

	switch (regionType) {
		case 'link':

			window.open(data.url);

			break;
		case 'zoom':

			var regionOffset = region.offset(),
				viewportOffset = $('.magazine-viewport').offset(),
				pos = {
					x: regionOffset.left - viewportOffset.left,
					y: regionOffset.top - viewportOffset.top
				};

			$('.magazine-viewport').zoom('zoomIn', pos);

			break;
		case 'to-page':

			$('.magazine').turn('page', data.page);

			break;
	}

}

// Load large page

function loadLargePage(page, pageElement) {

	// var img = $('<img />');

	// img.load(function () {

	// 	var prevImg = pageElement.find('img');
	// 	$(this).css({ width: '100%', height: '100%' });
	// 	$(this).appendTo(pageElement);
	// 	prevImg.remove();

	// });

	// // Loadnew page

	// img.attr('src', 'pages/' + page + '-large.jpg');
}

// Load small page

function loadSmallPage(page, pageElement) {

	// var img = pageElement.find('img');

	// img.css({ width: '100%', height: '100%' });

	// img.unbind('load');
	// // Loadnew page

	// img.attr('src', 'pages/' + page + '.jpg');
}

// http://code.google.com/p/chromium/issues/detail?id=128488

function isChrome() {

	return navigator.userAgent.indexOf('Chrome') != -1;

}

function disableControls(page) {

	if (page == 1)
		$('.previous-button').hide();
	else
		$('.previous-button').show();

	if (page == $('.magazine').turn('pages'))
		$('.next-button').hide();
	else
		$('.next-button').show();


}

// Set the width and height for the viewport

function resizeViewport() {

	var viewport = $('.magazine-viewport'),
		canvas = $('#canvas'),
		width = canvas.width() || $(window).width(),
		height = Math.max(1, (canvas.height() || $(window).height()) - 24),
		book = $('.magazine'),
		options = book.turn('options'),
		display = $.isTouch || width <= 900 ? 'single' : 'double';

	if (book.turn('display') !== display)
		book.turn('display', display);

	options.width = width;
	options.height = height;

	book.removeClass('animated');

	viewport.css({
		width: width,
		height: height
	}).
		zoom('resize');


	if (book.turn('zoom') == 1) {
		var bound = calculateBound({
			width: options.width,
			height: options.height,
			boundWidth: Math.min(options.width, width),
			boundHeight: Math.min(options.height, height)
		});

		if (bound.width % 2 !== 0)
			bound.width -= 1;


		if (bound.width != book.width() || bound.height != book.height()) {

			book.turn('size', bound.width, bound.height);

			if (book.turn('page') == 1 && book.turn('display') === 'double')
				book.turn('peel', 'br');

			$('.next-button').css({ height: bound.height, backgroundPosition: '-38px ' + (bound.height / 2 - 32 / 2) + 'px' });
			$('.previous-button').css({ height: bound.height, backgroundPosition: '-4px ' + (bound.height / 2 - 32 / 2) + 'px' });
		}

		book.css({ top: -bound.height / 2, left: -bound.width / 2 });
	}

	var magazineOffset = $('.magazine').offset(),
		boundH = height - magazineOffset.top - $('.magazine').height(),
		marginTop = (boundH - $('.thumbnails > div').height()) / 2;

	if (marginTop < 0) {
		$('.thumbnails').css({ height: 1 });
	} else {
		$('.thumbnails').css({ height: boundH });
		$('.thumbnails > div').css({ marginTop: marginTop });
	}

	if (magazineOffset.top < $('.made').height())
		$('.made').hide();
	else
		$('.made').show();

	if ($('#slider').hasClass('ui-slider')) {
		$('#slider').slider('option', 'max', numberOfViews(book));
		$('#slider').slider('value', getViewNumber(book));
	}

	book.addClass('animated');

}


// Number of views in a flipbook

function numberOfViews(book) {
	return book.turn('display') == 'single' ? book.turn('pages') : book.turn('pages') / 2 + 1;
}

// Current view in a flipbook

function getViewNumber(book, page) {
	var currentPage = page || book.turn('page');
	return book.turn('display') == 'single' ? currentPage : parseInt(currentPage / 2 + 1, 10);
}

function moveBar(yes) {
	if (Modernizr && Modernizr.csstransforms) {
		$('#slider .ui-slider-handle').css({ zIndex: yes ? -1 : 10000 });
	}
}

function setPreview(view) {

	var previewWidth = 112,
		previewHeight = 73,
		previewSrc = 'pages/preview.jpg',
		preview = $(_thumbPreview.children(':first')),
		numPages = (view == 1 || view == $('#slider').slider('option', 'max')) ? 1 : 2,
		width = (numPages == 1) ? previewWidth / 2 : previewWidth;

	_thumbPreview.
		addClass('no-transition').
		css({
			width: width + 15,
			height: previewHeight + 15,
			top: -previewHeight - 30,
			left: ($($('#slider').children(':first')).width() - width - 15) / 2
		});

	preview.css({
		width: width,
		height: previewHeight
	});

	if (preview.css('background-image') === '' ||
		preview.css('background-image') == 'none') {

		preview.css({ backgroundImage: 'url(' + previewSrc + ')' });

		setTimeout(function () {
			_thumbPreview.removeClass('no-transition');
		}, 0);

	}

	preview.css({
		backgroundPosition:
			'0px -' + ((view - 1) * previewHeight) + 'px'
	});
}

// Width of the flipbook when zoomed in

function largeMagazineWidth() {

	return 2214;

}

// decode URL Parameters

function decodeParams(data) {

	var parts = data.split('&'), d, obj = {};

	for (var i = 0; i < parts.length; i++) {
		d = parts[i].split('=');
		obj[decodeURIComponent(d[0])] = decodeURIComponent(d[1]);
	}

	return obj;
}

// Calculate the width and height of a square within another square

function calculateBound(d) {

	var bound = { width: d.width, height: d.height };

	if (bound.width > d.boundWidth || bound.height > d.boundHeight) {

		var rel = bound.width / bound.height;

		if (d.boundWidth / rel > d.boundHeight && d.boundHeight * rel <= d.boundWidth) {

			bound.width = Math.round(d.boundHeight * rel);
			bound.height = d.boundHeight;

		} else {

			bound.width = d.boundWidth;
			bound.height = Math.round(d.boundWidth / rel);

		}
	}

	return bound;
}
