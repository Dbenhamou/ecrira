const sharp = require('sharp')
const path = require('path')

const src = path.join(process.env.HOME, 'Downloads', 'Ecrira_horizontal_indigo_transparent_HD.png')
const dest = path.join(process.env.HOME, 'Downloads', 'ecrira', 'public', 'logo-ecrira-horizontal.png')

sharp(src)
  .trim({ background: '#FFFFFF', threshold: 30 }) // rogner fond blanc
  .png({ quality: 100 })
  .toFile(dest)
  .then(info => {
    console.log('✅ Logo sauvegardé :', dest)
    console.log('   Dimensions:', info.width, 'x', info.height)
  })
  .catch(err => console.error('❌', err))
