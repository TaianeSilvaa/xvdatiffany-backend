const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors"); // Adicionado para corrigir o erro de CORS
const { google } = require("googleapis");
require("dotenv").config();
const chave = JSON.parse(fs.readFileSync('./chave.json', 'utf-8'));

const app = express();
app.use(cors()); // Permitir requisições do frontend

const upload = multer({ dest: "uploads/" });

// Autenticação com Google Drive API
const auth = new google.auth.GoogleAuth({
  credentials: chave, // Alterado para usar JSON diretamente
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

app.post("/upload", upload.array("file",10), async (req, res) => {
  try {
    const uploadedFiles = [];

        for (const file of req.files) {
            const fileMetadata = {
                name: `${req.body.nome || "Anônimo"} - ${file.originalname}`, // Adiciona o nome do usuário
                parents: [process.env.FOLDER_ID], // ID da pasta no Google Drive
            };

            const media = {
                mimeType: file.mimetype,
                body: fs.createReadStream(file.path),
            };

            const uploadedFile = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: "id, webViewLink",
            });

            fs.unlinkSync(file.path); // Remove o arquivo temporário

            uploadedFiles.push({
                nome: req.body.nome || "Anônimo",
                link: uploadedFile.data.webViewLink,
            });
        }

        res.json({ files: uploadedFiles });
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).send(error);
  }
});

app.get("/fotos", async (req, res) => {
  try {
    const response = await drive.files.list({
      q: `'${process.env.FOLDER_ID}' in parents and mimeType contains 'image/'`,
      fields: "files(id, name, webViewLink)",
    });

    const fotos = response.data.files.map((file) => {
      // Extrai o nome do usuário do nome do arquivo
      const id = file.id;
      const partesNome = file.name.split(" - ");
      const nomeUsuario = partesNome.length > 1 ? partesNome[0] : "Anônimo";
      return { nome: nomeUsuario, link: file.webViewLink, id:'https://drive.google.com/thumbnail?id='+id+'&sz=w600'};
    });

    res.json(fotos);
  } catch (error) {
    console.error("Erro ao listar fotos:", error);
    res.status(500).send("Erro ao buscar fotos.");
  }
});


app.listen(3001, () => console.log("Servidor rodando na porta 3001"));
