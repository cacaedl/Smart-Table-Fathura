declare var $: any;

import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

interface PdfFile {
  name: string;
  type: string;
  size: string;
  url: string;
  uploadDate: string;
  selected: boolean;
  status: 'unintegrated' | 'sent' | 'loading';
  originalFile: File;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  pdfFiles: PdfFile[] = [];
  selectedPdfUrl: SafeResourceUrl | null = null;
  selectedFileName: string | null = null;
  p: number = 1; // Halaman saat ini

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {}

  // Meng-handle unggahan file
  fileuploads(event: any) {
    const files: FileList = event.target.files;

    if (files) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type !== 'application/pdf') {
          alert('Only PDF files are allowed');
          continue;
        }

        const fileData: PdfFile = {
          name: files[i].name,
          type: files[i].type,
          size: `${(files[i].size / 1024).toFixed(2)} KB`,
          url: URL.createObjectURL(files[i]),
          uploadDate: new Date().toLocaleDateString(),
          selected: false,
          status: 'unintegrated',
          originalFile: files[i]
        };

        this.pdfFiles.push(fileData);
      }
    }

    event.srcElement.value = null; // Reset input file
    this.sortFiles(); // Panggil fungsi untuk mengurutkan file
  }

  // Menampilkan modal dan preview file
  previewFile(pdfUrl: string, fileName: string) {
    this.selectedPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    this.selectedFileName = fileName; // Simpan nama file
    $('#pdfPreviewModal').modal('show'); // Tampilkan modal
  }

  closeModal() {
    this.selectedPdfUrl = null;
    this.selectedFileName = null;
    $('#pdfPreviewModal').modal('hide');
  }

  // Menghapus file dari daftar
  deleteFile(file: PdfFile) {
    if (file.status === 'sent') return; // Tidak bisa menghapus file dengan status sent

    const index = this.pdfFiles.indexOf(file);
    if (index > -1) {
      this.pdfFiles.splice(index, 1);
      console.log(`File ${file.name} berhasil dihapus.`);
    }
  }

  // Mendapatkan file yang dipilih
  getSelectedFiles(): PdfFile[] {
    return this.pdfFiles.filter((file) => file.selected);
  }

  // Menampilkan modal konfirmasi
  confirmSubmission() {
    const selectedFiles = this.getSelectedFiles();

    if (selectedFiles.length === 0) {
      alert('No files to process.');
      return;
    }

    $('#confirmationModal').modal('show');
  }

  // Tindakan berdasarkan konfirmasi pengguna
  confirmAction(confirm: boolean) {
    $('#confirmationModal').modal('hide');
    if (confirm) {
      this.submitSelectedFiles();
    } else {
      alert('Process Canceled.');
    }
  }

  // Tambahkan properti untuk modal notifikasi
  notificationMessage: string | null = null;

  showNotification(message: string) {
    this.notificationMessage = message;
    $('#notificationModal').modal('show'); // Menampilkan modal
  }

  closeNotification() {
    this.notificationMessage = null;
    $('#notificationModal').modal('hide');
  }

  // Mengirim file yang dipilih
  async submitSelectedFiles() {
    const selectedFiles = this.getSelectedFiles();

    if (selectedFiles.length === 0) {
      alert('No file selected.');
      return;
    }

    for (const file of selectedFiles) {
      file.status = 'loading'; // Indikator loading
      try {
        const response = await this.processFile(file);
        file.status = 'sent'; // Ubah status menjadi "Sent"
        file.selected = false;
        console.log(`File sent successfully: ${response.message}`);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        file.status = 'unintegrated';
      }
    }
    this.showNotification('All selected files have been successfully sent! 😊');
    this.sortFiles(); // Urutkan file setelah pengiriman
  }


  

  // Fungsi untuk mengirim file ke API backend
  processFile(file: PdfFile): Promise<any> {
    const apiUrl = 'http://34.46.13.194/process-form?projectId=1013979914327&location=us&processorId=fcb032b8a42fd0f4'; // alamat API
    
    const formData = new FormData();
    formData.append('file', file.originalFile, file.name);

    return new Promise((resolve, reject) => {
      this.http.post(apiUrl, formData).subscribe(
        (response: any) => {
          if (response) {
            resolve(response);
          } else {
            reject(new Error('Invalid response format'));
          }
        },
        (error) => {
          console.error(`Error sending file ${file.name}:`, error);
          reject(error);
        }
      );
    });
  }

  // Mengurutkan file berdasarkan status
  sortFiles() {
    this.pdfFiles.sort((a, b) => {
      if (a.status === 'sent' && b.status !== 'sent') {
        return -1;
      }
      if (a.status !== 'sent' && b.status === 'sent') {
        return 1;
      }
      return 0;
    });
  }

  // Properti baru untuk menyimpan hasil JSON
  resultJson: any = null;

  viewResult(file: PdfFile) {
    const apiUrl = `http://34.46.13.194/process-form?projectId=1013979914327&location=us&processorId=fcb032b8a42fd0f4`;
  
    // Gunakan `HttpClient` untuk mem-fetch hasil
    this.http.post(apiUrl, { responseType: 'json' }).subscribe(
      (response: any) => {
        if (response) {
          this.resultJson = response; // Simpan hasil JSON dari API
          this.showResultModal(); // Tampilkan modal
        } else {
          console.error('Unexpected response format:', response);
          alert('Failed to retrieve data. Please check the API.');
        }
      },
      (error) => {
        console.error(`Error fetching result for ${file.name}:`, error);
        alert('Failed to retrieve the JSON file result.');
      }
    );
  }
  
  
  copyToClipboard(data: any) {
    const textToCopy = JSON.stringify(data, null, 2); // Format data
    navigator.clipboard.writeText(textToCopy).then(
      () => alert('Data copied to clipboard!'),
      (error) => console.error('Failed to copy text:', error)
    );
  }
  

  showResultModal() {
    $('#resultModal').modal('show');
  }

  closeResultModal() {
    this.resultJson = null;
    $('#resultModal').modal('hide');
  }
}
