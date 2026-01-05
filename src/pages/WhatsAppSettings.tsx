import { useState, useEffect } from 'react';
import { useZAPIConnection } from '@/hooks/useZAPIConnection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, QrCode, RefreshCw, Unplug, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function WhatsAppSettings() {
  const { status, loading, qrLoading, checkStatus, getQRCode, disconnect, restart } = useZAPIConnection();
  const [pollingQR, setPollingQR] = useState(false);

  // Poll for QR code when not connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (pollingQR && !status.connected) {
      interval = setInterval(async () => {
        const result = await getQRCode();
        if (result?.connected) {
          setPollingQR(false);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollingQR, status.connected, getQRCode]);

  const handleConnect = async () => {
    setPollingQR(true);
    await getQRCode();
  };

  const handleDisconnect = async () => {
    setPollingQR(false);
    await disconnect();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações do WhatsApp</h1>
            <p className="text-muted-foreground">Conecte seu WhatsApp via Z-API</p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Status da Conexão
            </CardTitle>
            <CardDescription>
              Verifique o status da sua conexão com o WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando conexão...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={status.connected ? 'default' : 'secondary'} className={cn(
                    status.connected && 'bg-green-500 hover:bg-green-600'
                  )}>
                    {status.connected ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
                    )}
                  </Badge>
                </div>

                {status.smartphoneConnected !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Celular Online</span>
                    <Badge variant={status.smartphoneConnected ? 'default' : 'secondary'}>
                      {status.smartphoneConnected ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                )}

                {status.error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {status.error}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={checkStatus} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                  {status.connected && (
                    <Button onClick={handleDisconnect} variant="outline" size="sm">
                      <Unplug className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  )}
                  <Button onClick={restart} variant="outline" size="sm">
                    Reiniciar Instância
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        {!status.connected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Conectar WhatsApp
              </CardTitle>
              <CardDescription>
                Escaneie o QR Code com seu WhatsApp para conectar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {status.qrcode ? (
                  <>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                      <img 
                        src={`data:image/png;base64,${status.qrcode}`}
                        alt="QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Abra o WhatsApp no seu celular, vá em <strong>Configurações → Aparelhos Conectados</strong> e escaneie este código.
                    </p>
                    {pollingQR && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Aguardando conexão...
                      </div>
                    )}
                  </>
                ) : (
                  <Button onClick={handleConnect} disabled={qrLoading}>
                    {qrLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando QR Code...</>
                    ) : (
                      <><QrCode className="h-4 w-4 mr-2" /> Gerar QR Code</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connected Info */}
        {status.connected && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">WhatsApp Conectado!</h3>
                  <p className="text-sm text-muted-foreground">
                    Você pode voltar ao painel e começar a atender.
                  </p>
                </div>
              </div>
              <Link to="/" className="block mt-4">
                <Button className="w-full">
                  Ir para o Painel de Atendimento
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Webhook Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Configuração do Webhook</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Configure esta URL no painel da Z-API para receber mensagens:
            </p>
            <code className="block p-3 bg-muted rounded text-xs break-all">
              https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-webhook
            </code>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
