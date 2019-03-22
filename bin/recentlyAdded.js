require('isomorphic-fetch');

fetch('https://relistenapi.alecgorge.com/api/v2/shows/recently-added?limit=50')
  .then(res => res.json())
  .then(json => {
    json.map(source => {
      const [year, month, day] = source.display_date.split('-');
      console.log(`${year}/${month}/${day} - ${source.artist.name} - ${source.venue.name} https://relisten.net/${source.artist.slug}/${year}/${month}/${day}?source=${source.id} ${source.has_soundboard_source ? '[SBD]' : ''}`);
    })
  })