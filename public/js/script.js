// Toggle menu untuk tampilan mobile
document.getElementById('menu-button').addEventListener('click', function () {
  var menu = document.getElementById('mobile-menu');
  if (menu.classList.contains('hidden')) {
    menu.classList.remove('hidden');
  } else {
    menu.classList.add('hidden');
  }
});

// tombol close peringatan
document.getElementById('error-close').addEventListener('click', function() {
  document.getElementById('error-container').classList.add('hidden');
});

// Toggle dropdown language (desktop)
const langButton = document.getElementById('lang-button');
const langDropdown = document.getElementById('lang-dropdown');

langButton.addEventListener('click', function (event) {
  event.preventDefault();
  if (langDropdown.classList.contains('hidden')) {
    langDropdown.classList.remove('hidden');
  } else {
    langDropdown.classList.add('hidden');
  }
});

// Toggle dropdown language (mobile)
const langButtonMobile = document.getElementById('lang-button-mobile');
const langDropdownMobile = document.getElementById('lang-dropdown-mobile');

langButtonMobile.addEventListener('click', function (event) {
  event.preventDefault();
  if (langDropdownMobile.classList.contains('hidden')) {
    langDropdownMobile.classList.remove('hidden');
  } else {
    langDropdownMobile.classList.add('hidden');
  }
});

// Pilih file gambar
document.getElementById('choose-images').addEventListener('click', function () {
  document.getElementById('image-upload').click();
});
  
// Proses upload gambar
document.getElementById('image-upload').addEventListener('change', async function (event) {
  var file = event.target.files[0];
  if (!file) {
    await alert("Jangan lebih dari 1 gambar.");
    return;
  }
  // Tampilkan preview gambar asli
  var imgContainer = document.getElementById('img-preview-container');
  var inputContainer = document.getElementById('input-container');
  inputContainer.classList.add('hidden');
  var imgPreview = document.createElement('img');
  imgPreview.src = URL.createObjectURL(file);
  imgPreview.classList.add('inset-0', 'w-full', 'h-full', 'object-cover', 'object-center', 'z-10');
  imgPreview.id = 'image-preview';
  imgContainer.appendChild(imgPreview);
  
  // Tampilkan tombol submit dan sembunyikan hasil sebelumnya
  document.getElementById('submit-button').classList.remove('hidden');
  // document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
});

document.getElementById('submit-button').addEventListener('click', async function(event) {
  event.preventDefault();
  // Sembunyikan tombol submit, tampilkan loading, sembunyikan hasil
  document.getElementById('submit-button').classList.add('hidden');
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('image-preview').remove();

  // Reset atau tampilkan progress (pastikan ada elemen dengan id "progress" di HTML)
  const progressElem = document.getElementById('progress');
  progressElem.innerText = '';

  var inputContainer = document.getElementById('input-container');
  inputContainer.classList.remove('hidden');

  var file = document.getElementById('image-upload').files[0];
  if (!file) {
    await alert("Tidak ada gambar yang dipilih.");
    return;
  }
  
  // Buat FormData untuk mengirim file ke API
  var formData = new FormData();
  formData.append('image', file);

  // Secret untuk API
  var secretResponse = new Date().getUTCMinutes().toString();
  
  try {
    const response = await fetch('/api/toanime', {
      method: 'POST',
      body: formData
    });
    
    // Membaca streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let progressText = '';
    
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      progressText += chunk;
      progressElem.innerText = progressText; // Update UI progress
    }
    
    // Ekstrak final JSON result dari progressText (asumsikan final line diawali dengan "Final Result:")
    const finalMarker = "Final Result:";
    const finalIndex = progressText.lastIndexOf(finalMarker);
    if (finalIndex !== -1) {
      const jsonString = progressText.substring(finalIndex + finalMarker.length).trim();
      const finalResult = JSON.parse(jsonString);
      
      // Tampilkan gambar asli dan gambar anime
      var originalImage = document.getElementById('original-image');
      originalImage.src = finalResult.data.img_original;

      var upscaledImage = document.getElementById('upscaled-image');
      upscaledImage.src = finalResult.data.img_anime;

      var downloadButton = document.getElementById('download-button');
      downloadButton.innerHTML = ''; // bersihkan konten sebelumnya
      var link = document.createElement('a');
      link.href = `/downloads/${finalResult.id}`;
      downloadButton.appendChild(link);
      downloadButton.addEventListener('click', function () {
        link.click();
      });
    }
    
    // Sembunyikan loading dan tampilkan container hasil
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('result').classList.remove('hidden');
    
  } catch (error) {
    console.error(error);
    if (error.response && error.response.status === 403) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('result').classList.add('hidden');
      await alert("Kesalahan API Key. Silakan kontak owner.");
      return;
    } else {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('result').classList.add('hidden');
      await alert("Terjadi kesalahan saat memproses gambar. Silakan kontak owner.");
    }
  }
});
