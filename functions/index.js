// Importa a função específica da versão 2 do SDK
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

// Inicializa o Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function (v2) que é acionada sempre que um novo documento
 * é criado na coleção 'leads'.
 */
exports.notificarNovoLead = onDocumentCreated("leads/{leadId}", async (event) => {
  // 1. Pega os dados do novo lead que foi criado
  // A sintaxe para pegar os dados na v2 é event.data.data()
  const novoLead = event.data.data();
  console.log("Novo lead recebido:", novoLead.nomeCliente);

  // 2. Define quais gestores devem ser notificados.
  const grupoParaNotificar = "comercial";
  const gestoresRef = admin.firestore().collection("gestores");
  const gestoresSnapshot = await gestoresRef.where("grupo", "==", grupoParaNotificar).get();

  if (gestoresSnapshot.empty) {
    console.log(`Nenhum gestor encontrado para o grupo '${grupoParaNotificar}'.`);
    return null;
  }

  // 3. Coleta os tokens de notificação (fcmToken) de cada gestor
  const tokens = [];
  gestoresSnapshot.forEach((doc) => {
    const gestor = doc.data();
    if (gestor.fcmToken) {
      tokens.push(gestor.fcmToken);
    }
  });

  if (tokens.length === 0) {
    console.log("Nenhum token de notificação válido encontrado para os gestores.");
    return null;
  }

  // 4. Monta a mensagem da notificação
  const payload = {
    notification: {
      title: "✨ Novo Lead Recebido!",
      body: `Cliente: ${novoLead.nomeCliente || "Não informado"}. Clique para ver os detalhes.`,
      icon: "https://agro-divel.web.app/assets/images/logo_notification.png",
      click_action: "https://agro-divel.web.app/Pages/Controles/Leads.html",
    },
  };

  // 5. Envia a notificação para todos os tokens coletados
  try {
    const response = await admin.messaging( ).sendToDevice(tokens, payload);
    console.log("Notificações enviadas com sucesso:", response.successCount);
    // Limpeza de tokens inválidos (opcional, mas recomendado)
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error("Falha ao enviar para o token:", tokens[index], error);
        if (error.code === 'messaging/registration-token-not-registered') {
          // gestoresSnapshot.docs[index].ref.update({ fcmToken: admin.firestore.FieldValue.delete() });
        }
      }
    });
  } catch (error) {
    console.error("Erro ao enviar notificações:", error);
  }

  return null;
});