import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, fileName, folderName } = await req.json();

    const fileResponse = await fetch(fileUrl);
    const fileBlob = await fileResponse.blob();
    const fileBuffer = await fileBlob.arrayBuffer();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    let folderId = null;
    if (folderName) {
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        folderId = searchData.files[0].id;
      } else {
        const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          })
        });
        const folderData = await folderResponse.json();
        folderId = folderData.id;
      }
    }

    const metadata = {
      name: fileName,
      ...(folderId && { parents: [folderId] })
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const metadataBody = delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/octet-stream\r\n\r\n';

    const uint8Array = new Uint8Array(fileBuffer);
    const combinedArray = new Uint8Array(
      metadataBody.length + uint8Array.length + closeDelim.length
    );
    
    const encoder = new TextEncoder();
    const metadataBytes = encoder.encode(metadataBody);
    const closeBytes = encoder.encode(closeDelim);
    
    combinedArray.set(metadataBytes, 0);
    combinedArray.set(uint8Array, metadataBytes.length);
    combinedArray.set(closeBytes, metadataBytes.length + uint8Array.length);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: combinedArray
      }
    );

    const fileData = await uploadResponse.json();

    return Response.json({
      success: true,
      fileId: fileData.id,
      fileName: fileData.name,
      webViewLink: `https://drive.google.com/file/d/${fileData.id}/view`,
      folderName: folderName
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});