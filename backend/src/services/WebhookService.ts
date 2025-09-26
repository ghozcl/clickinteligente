import QueueIntegrations from "../models/QueueIntegrations";
import AppError from "../errors/AppError";
import axios from "axios";

class WebhookService {
  // Listar todas las integraciones
  static async listIntegrations() {
    return await QueueIntegrations.findAll({
      order: [["createdAt", "DESC"]],
    });
  }

  // Crear nueva integración
  static async createIntegration(name: string, urlN8N: string, projectName: string) {
    const exists = await QueueIntegrations.findOne({ where: { name } });
    if (exists) throw new AppError("Integration name already exists");
    const integration = await QueueIntegrations.create({
      name,
      urlN8N,
      projectName,
    });
    return integration;
  }

  // Actualizar integración
  static async updateIntegration(
    id: number,
    name: string,
    urlN8N: string,
    projectName: string
  ) {
    const integration = await QueueIntegrations.findByPk(id);
    if (!integration) throw new AppError("Integration not found");
    await integration.update({ name, urlN8N, projectName });
    return integration;
  }

  // Eliminar integración
  static async deleteIntegration(id: number) {
    const integration = await QueueIntegrations.findByPk(id);
    if (!integration) throw new AppError("Integration not found");
    await integration.destroy();
  }

  // Disparar webhook SOLO con el payload que se le pasa
  static async triggerWebhook(event: string, data: any) {
    const integrations = await QueueIntegrations.findAll();
    for (const integration of integrations) {
      if (integration.urlN8N) {
        try {
          await axios.post(integration.urlN8N, {
            event,
            data, // 🔹 Aquí solo va el payload que le envías (ej: webhookPayload)
          });
        } catch (err: any) {
          console.error(`❌ Error triggering webhook for ${integration.name}:`, err.message);
        }
      }
    }
  }
}

export default WebhookService;
