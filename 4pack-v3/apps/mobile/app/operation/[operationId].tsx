import { TrackingView } from "../../features/importer/views";
import { testPayment } from '../../lib/test-payments';
import { phaseLabels } from "@4pack/domain";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, useRef } from "react";
import * as DocumentPicker from "expo-document-picker";
import {randomUUID} from "expo-crypto";
import type {NativeMsds} from "../../lib/cargo-publication";
import {
  ActivityIndicator,
  AppState,
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  loadOwnRating,
  rateCompletedOperator,
  operationEvidenceUrl,
  confirmDelivery,
  loadOperationDetail,
  sendOperationMessage,
  simulateGuarantee,
  type MobileOperationDetail,
  uploadOperationDocument,
  openOperationClaim,
} from "../../lib/dashboard";

const guaranteeLabels = {
  pending: "Pendiente de confirmación",
  proof_uploaded: "Comprobante cargado",
  verified: "Verificada",
  held_simulated: "Confirmada · simulación académica",
  released_simulated: "Liberada · simulación académica",
  rejected: "Rechazada",
};

export default function OperationDetailScreen() {
  const params = useLocalSearchParams<{ operationId: string }>();
  const operationId = Array.isArray(params.operationId)
    ? params.operationId[0]
    : params.operationId;
  const [operation, setOperation] = useState<MobileOperationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState<{ id: string } | null>(null);
  const [score, setScore] = useState(5),
    [comment, setComment] = useState("");
  const [showMessages, setShowMessages] = useState(false);
  const pendingUpload=useRef<{file:NativeMsds;key:string;type:string}|null>(null);
  const claimKey=useRef(randomUUID());
  async function attachDocument(type:string){
    setActionLoading(true);setError("");try{
      if(!pendingUpload.current||pendingUpload.current.type!==type){const picked=await DocumentPicker.getDocumentAsync({type:"application/pdf",copyToCacheDirectory:true,multiple:false});if(picked.canceled)return;const f=picked.assets[0];pendingUpload.current={file:{uri:f.uri,name:f.name,mimeType:f.mimeType??"application/pdf",size:f.size??0},key:randomUUID(),type};}
      const pending=pendingUpload.current;await uploadOperationDocument(operationId,type,pending.file,pending.key);pendingUpload.current=null;await refresh(true);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo subir el documento. Reintentá con el mismo archivo.");}finally{setActionLoading(false);}
  }
  async function reportClaim(subject:string,body:string){
    setActionLoading(true);setError("");try{await openOperationClaim(operationId,claimKey.current,subject,body);claimKey.current=randomUUID();await refresh(true);}catch(e){setError(e instanceof Error?e.message:"No se pudo registrar el reclamo.");}finally{setActionLoading(false);}
  }
  async function openEvidence(id: string) {
    try {
      await Linking.openURL(await operationEvidenceUrl(id));
    } catch {
      setError("No se pudo abrir la evidencia autorizada.");
    }
  }
  async function sendRating() {
    setActionLoading(true);
    try {
      await rateCompletedOperator(operationId, score, comment);
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo evaluar.");
    } finally {
      setActionLoading(false);
    }
  }
  const [message, setMessage] = useState("");

  const refresh = useCallback(
    async (silent = false) => {
      if (!operationId) return;
      if (!silent) setLoading(true);
      setError("");
      try {
        setOperation(await loadOperationDetail(operationId));
        setRating(await loadOwnRating(operationId));
      } catch {
        setError("No pudimos cargar la operación.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [operationId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function syncPayment() {
    if (operation?.paymentMode !== 'mercado_pago_test') return;
    setActionLoading(true);
    try {
      await testPayment(operationId, 'sync');
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo verificar el pago.');
    } finally { setActionLoading(false); }
  }
  useEffect(() => {
    if (operation?.paymentMode !== 'mercado_pago_test') return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh(true);
    });
    return () => subscription.remove();
  }, [operation?.paymentMode, operationId]);

  async function runGuarantee() {
    if (!operationId) return;
    setActionLoading(true);
    setError("");
    try {
      if (operation?.paymentMode === 'mercado_pago_test') {
        const payment = await testPayment(operationId, 'checkout');
        if (payment.checkout_url) {
          const { openBrowserAsync } = await import('expo-web-browser');
          await openBrowserAsync(payment.checkout_url);
        }
        await testPayment(operationId, 'sync');
      } else {
        await simulateGuarantee(operationId);
      }
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos confirmar el pago de prueba.');
    } finally {
      setActionLoading(false);
    }
  }

  async function runNextStep() {
    if (!operationId || !operation) return;
    if (
      operation.role !== "importer" ||
      !["awaiting_delivery_confirmation","disputed"].includes(operation.phase)
    )
      return;
    setActionLoading(true);
    setError("");
    try {
      await confirmDelivery(operationId);
      await refresh(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos confirmar la entrega. Revisá el pago y la evidencia.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function sendMessage() {
    if (!operationId || !message.trim()) {
      setError("Escribí un mensaje antes de enviarlo.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await sendOperationMessage(operationId, message.trim());
      setMessage("");
      await refresh(true);
    } catch {
      setError("No pudimos enviar el mensaje.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackingView
        operation={operation}
        rating={rating}
        score={score}
        comment={comment}
        onScore={setScore}
        onComment={setComment}
        busy={actionLoading}
        error={error}
        onGuarantee={() => void runGuarantee()}
        onPaymentSync={() => void syncPayment()}
        onDocument={(type)=>void attachDocument(type)}
        onClaim={(subject,body)=>void reportClaim(subject,body)}
        onComplete={() =>
          Alert.alert(
            "Confirmar entrega",
            "Confirma que recibiste la carga. La liberación de prueba exige pago verificado y queda en revisión si hay un reclamo abierto.",
            [
              { text: "Volver", style: "cancel" },
              {
                text: "Confirmar recepcion",
                onPress: () => void runNextStep(),
              },
            ],
          )
        }
        onRate={() => void sendRating()}
        onEvidence={(id) => void openEvidence(id)}
        message={message}
        onMessage={setMessage}
        onSend={() => void sendMessage()}
        onRefresh={() => void refresh(true)}
        onBack={() => router.back()}
      />
    </>
  );
}
