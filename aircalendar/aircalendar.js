/*
 * AirCalendar
 * (c) 2019 Heracles Papatheodorou
 * https://heracl.es
 * MIT license
 * 
 */

var loadCalendar = function(selector,lang) {
	$(selector).empty();

	var i18n = [];
	i18n['en'] = {
		'no results': 'There are no upcoming events.',
		'google calendar': 'Add to Google Calendar',
		'timezone': 'Timezone: ',
		'unknown': 'Unknown end',
		'starts': 'Starts in',
		'ends': 'Ends in',
		'started': 'Event has started',
		'ended': 'Event has ended',
		'day': 'day',
		'days': 'days',
		'h': 'h',
		'hour': 'hour',
		'hours': 'hours',
	};
	i18n['el'] = {
		'no results': 'Δεν υπάρχουν προσεχείς εκδηλώσεις.',
		'google calendar': 'Προσθήκη στο Google Calendar',
		'timezone': 'Ζώνη ώρας: ',
		'unknown': 'Άγνωστη λήξη',
		'starts': 'Αρχίζει σε',
		'ends': 'Τελειώνει σε',
		'started': 'Έχει αρχίσει',
		'ended': 'Έχει τελειώσει',
		'day': 'μέρα',
		'days': 'μέρες',
		'h': 'ω',
		'hour': 'ώρα',
		'hours': 'ώρες',
	};


	base(baseName).select({
		sort: [{
			field: 'offset',
			direction: 'asc',
		}],
		// filterByFormula: 'AND(lang = "' + lang + '")', // DEBUG, filter by language
		// filterByFormula: 'AND(offset != -1)', // DEBUG, hide past events
		view: baseView, // DEBUG, use view's sort and filters
	}).eachPage(function page(records, fetchNextPage) {

		if (typeof records === undefined || records.length == 0) {
		   $(selector).append($('<p class="error">').text(i18n[lang]['no results']));
		}
		// console.log(records); // DEBUG

		records.forEach(function(record) {
			// console.log('Retrieved ', record.get('name')); // DEBUG

			var image = record.get('image');
			var startDate = new Date((record.get('start') === undefined) ? Date.now() : record.get('start'));
			var endDate = new Date(record.get('end'));
			var lang = (record.get('lang') === undefined) ? 'en' : record.get('lang'); // DEBUG

			// add .invalid css class if there is no start date
			var cssClass = (record.get('class') === undefined) ? (record.get('start') === undefined ? ['invalid'] : []) : record.get('class');

			var context = (record.get('context') === undefined) ? [] : record.get('context');
			var tags = (record.get('tags') === undefined) ? [] : record.get('tags');

			// create the time structure for duration
			var duration = $('<p class="event-duration" title="' + i18n[lang]['timezone'] + startDate.format('Z') + '">');


			// add the end date if different from start date
			if (isNaN(endDate)) {
				var startFormat = 'dd mmm yyyy';
				// var endFormat = '"– ?"'; // doesn't work as intented

				//add case for no end date but not all day!
			} else if (record.get('all-day') == true) {
				var startFormat = 'dd mmm';
				var endFormat = '– dd mmm yyyy';
			} else if (startDate.getDate() === endDate.getDate() && startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
				var startFormat = 'dd mmm yyyy (HH:MM';
				var endFormat = '– HH:MM Z)';
			} else {
				var startFormat = 'dd mmm (HH:MM)';
				var endFormat = '– dd mmm yyyy (HH:MM)'; // show timezone here?
			}

			// add the start date
			duration.append($('<time class="dt-start">').attr({
						datetime:startDate,
						itemprop:'startDate',
						content:startDate
					}).text( startDate.format(startFormat,'',lang) )
			);

			// add end date
			if (isNaN(endDate)) {
				if (!isNaN(record.get('end-unknown'))) {
					duration.append($('<time>').text('– ?'));
				}
			} else {
				duration.append(
					$('<time class="dt-end">').attr({
						datetime:endDate,
						itemprop:'endDate',
						content:endDate
					}).text( endDate.format(endFormat,'',lang) )
				);
			}


			// create the event structure
			var event = $('<article class="h-event" lang="' + lang + '" itemscope itemtype="http://schema.org/Event">');

			// add image if it exists
			if (image != null) {
				event.append($('<figure class="event-thumbnail">').append($('<img>', {'src':image[0].thumbnails.large.url})));
			} else {
				event.append($('<figure class="event-thumbnail">'));
			}

			// create the tags / meta
			var category = $('<p class="p-category">');
				category.append($('<span class="event-context tooltip">').attr('title',context).text(context));
				category.append($('<span class="event-tags tooltip">').attr('title',tags.join(', ')).text( '​' + tags.join(', ')));
			event.append(category);

			// add event name
			event.append($('<h3 class="p-name">').text(record.get('name')));

			// add hyperlink
			var summary = $('<p class="p-summary" itemprop="description">').text(record.get('summary'));
			if (record.get('url') !== undefined) {
				summary.wrapInner($('<a href="' + record.get('url') + '" class="u-url" itemprop="url"></a>'));
			}
			// event.append($('<p class="p-summary" itemprop="description">').text(summary));
			event.append(summary);


			// add location
			if (record.get('location') !== undefined) {
				event.append($('<a class="p-location" target="_blank" href="https://www.google.com/maps?q='+encodeURI(record.get('location'))+'">').text( record.get('location')));
			}

			// add the offset (starts in... ends in... seconds)
			// add a check, should be less than 15 days
			var now = new Date(Date.now());

			if (startDate < now && !isNaN(record.get('end-unknown'))) {
				var offset = now;
				var label = 'unknown';
			} else if (!isNaN(endDate) && endDate < now) {
				// var offset = '';
				// var label = '';
			} else if (!isNaN(endDate) || !isNaN(record.get('end-unknown'))) {
				if (startDate > now) {
					var offset = startDate.getTime();
					var label = 'starts';
				} else {
					var offset = endDate.getTime();
					var label = 'ends';
				}
			} else {
				var offset = startDate.getTime();
				var label = 'starts';
			}

			// only display if a positive value (i.e. not in the past)
			if (record.get('offset') != -1) {				
				event.append($('<time class="event-offset" lang="' + lang + '">').data({
					offset: offset,
					label: label
				}));
			}

			// add duration to event
			event.append(duration);

			// add save to calendar link
			// via https://stackoverflow.com/questions/5831877/how-do-i-create-a-link-to-add-an-entry-to-a-calendar
			var calendarlink = 'https://calendar.google.com/calendar/r/eventedit?';
				calendarlink += '&text=' + encodeURI(record.get('name'));

				if (!isNaN(endDate) && record.get('all-day') == true) {
					calendarlink += '&dates=' + startDate.format('UTC:yyyymmdd');
					calendarlink += '/' + endDate.format('UTC:yyyymmdd');
				} else if (isNaN(endDate)) {
					calendarlink += '&date=' + startDate.format('UTC:yyyymmdd');
				} else {
					calendarlink += '&dates=' + startDate.format('UTC:yyyymmdd"T"HHMMss');
					calendarlink += '/' + endDate.format('UTC:yyyymmdd"T"HHMMss');
				}

				calendarlink += '&ctz=UTC';
				calendarlink += '&details=' + encodeURI(record.get('context') +"\n"+ tags.join(', ') +"\n\n"+ record.get('summary'));

				if (record.get('location') !== undefined) {
					calendarlink += '&location=' + encodeURI(record.get('location'));
				}

			event.append($('<a class="event-add" target="_blank" title="' + i18n[lang]['google calendar'] + '" href="' + calendarlink + '">').text('⭗')); // 📅

			// event.attr('data-record-id', record.getId()); // DEBUG

			// add active classes when it's happening
			if (startDate < now && (now < endDate || !isNaN(record.get('end-unknown')))) {
				event.addClass('active');
			}

			// add class for where an event is in the past
			if (record.get('offset') == '-1') {
				event.addClass('past');
			}

			// add any manual classes
			event.addClass(cssClass.join(','));

			// add URL around the event
			if (record.get('url') !== undefined) {
				// event.wrapInner('<a href="' + record.get('url') + '" class="u-url" itemprop="url"></a>')
			}

			// add event to parent
			$(selector).append(event);
		});

		fetchNextPage();
	}, function done(error) {
			if (error !== 'null') {
			// prepend numbers with zeroes
			// put this prototype out of here
			Number.prototype.pad = function(size) {
				var sign = Math.sign(this) === -1 ? '-' : '';
				return sign + new Array(size).concat([Math.abs(this)]).join('0').slice(-size);
			}

			// update the countdown
			setInterval(function(){
				var now = new Date(Date.now());

				$(selector + ' .h-event:not(.past) .event-offset').each(function() {
					var offset = $(this).data('offset') - now;
					var seconds = Math.floor(offset/1000);
					var minutes = Math.floor(seconds/60);
					var hours = Math.floor(minutes/60);
					var days = Math.floor(hours/24);

						hours = hours-(days*24);
						minutes = minutes-(days*24*60)-(hours*60);
						seconds = seconds-(days*24*60*60)-(hours*60*60)-(minutes*60);

					var countdown = i18n[$(this).attr('lang')][$(this).data('label')] + ' ';
					var countdowndetails = countdown;

					// if event has unknown end...
					if ($(this).data('label') == 'unknown') {
						countdown = i18n[$(this).attr('lang')]['started'];
						countdowndetails = ''
					} else if (offset.toString().slice(0,-3) == 0 && $(this).data('label') == 'ends') {
						// $(this).removeClass('event-offset');
						// $(this).remove();
						$(this).closest('.h-event').removeClass('active').addClass('past');
						$(this).addClass('highlight');
						countdown = i18n[$(this).attr('lang')]['ended'];
						countdowndetails = '';
					} else if (offset.toString().slice(0,-3) == 0 && $(this).data('label') == 'starts') {
						$(this).closest('.h-event').addClass('active');
						$(this).addClass('highlight');
						$(this).data({ label: 'unknown' });
						countdown = i18n[$(this).attr('lang')]['started'];
						countdowndetails = '';
					} else if (days > 15 && $(this).data('label') == 'starts') {
						$(this).remove();
						// countdown = '';
						// countdowndetails += days + ' ' + i18n[$(this).attr('lang')]['days'] + ', ';
					} else if (days == 1) {
						countdown += days + ' ' + i18n[$(this).attr('lang')]['day'];
						countdowndetails += days + ' ' + i18n[$(this).attr('lang')]['day'] + ', ';
					} else if (days > 0) {
						countdown += days + ' ' + i18n[$(this).attr('lang')]['days'];
						countdowndetails += days + ' ' + i18n[$(this).attr('lang')]['days'] + ', ';
					} else if (hours == 1) {
						countdown += hours + ' ' + i18n[$(this).attr('lang')]['hour'];
					} else if (hours > 1) {
						countdown += hours + ' ' + i18n[$(this).attr('lang')]['hours'];
					} else {
						// countdown += minutes + '′ ' + seconds + '″'; // Alt style
						countdown += minutes.pad(2) + ':' + seconds.pad(2);
					}

					// countdowndetails += hours+i18n[$(this).attr('lang')]['h']+' '+minutes + '′ ' + seconds + '″'; // Alt style
					countdowndetails += hours.pad(2)+':'+minutes.pad(2)+':'+seconds.pad(2);

					$(this).text(countdown).attr('title',countdowndetails);
				});
			},1000);
		} else {
			console.log(error);
			// $(selector).append($('<p class="error">').text(error));
		}

	});
};
// end of file