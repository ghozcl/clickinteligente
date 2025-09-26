Version de Whatiket actualizada, complementada con la version de Chasap que tambien es basado en Whaticket.

Realice actualizacion el archivo WbotMessageListener.ts

agregando conversion de audio de whatsapp a audio MP3, guardandose en la carpeta https://tu.sitioweb.cl/public/audios/ 
para asi permitir la conexion con make.
Se edito el archivo del webhook, para permitir la conexion a make y que funcione, siendo que hacia otra cosa y no webhooks, con la modificacion quedo como webhooks puro para n8n/Make.
Se crearon archivos nuevos de audios y de transcripciones.

Todo esto pensando en usar el formato para recibir mensaje y estos enviarlos a un webhooks, el cual se usa make para implementar un sistema de respuesta basado en gpt para texto o audio, siendo asi la mejor respuesta ya que mediante make se genera un modulo en gpt se asigna un thread_id y asi el bot tiene contexto de la conversacion. no como en el bot que incluye por defecto el software.
