#!/bin/bash
# Script para añadir variables de entorno a Vercel usando la CLI
# Requiere: vercel CLI instalado y autenticado

echo "🚀 Añadiendo variables de entorno a Vercel..."

cd web || exit 1

# Variables de entorno a añadir
declare -A env_vars=(
    ["NEXT_PUBLIC_SUPABASE_URL"]="https://dcjqjsmyydqpsmxbkhya.supabase.co"
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzQ3MTUsImV4cCI6MjA4MDM1MDcxNX0.AQ-K6u8zxwREbrr_I7Lcfa8OQsUAUIYafzA4jGFs5ec"
    ["SUPABASE_SERVICE_ROLE_KEY"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc3NDcxNSwiZXhwIjoyMDgwMzUwNzE1fQ.ZsO4uTR-dW7KMtI553zLUyQam1hRcAa5QJXRzox3qMo"
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY"]="BO2iL6_79-RNilgRKwV_qomTo01TbYbjfnBMDhPAcFV8BCLHlJGv6uQGRtW7P_RnHGUrHrzTok1otPwzqbRvOfY"
    ["VAPID_PRIVATE_KEY"]="zS-Zv7jb63h_25_26ihXHoevdpfyufu-gBUU91l7tvU"
    ["VAPID_SUBJECT"]="mailto:admin@idmji.org"
)

# Targets para cada variable
targets="production preview development"

success_count=0
error_count=0

for key in "${!env_vars[@]}"; do
    value="${env_vars[$key]}"
    echo ""
    echo "📝 Añadiendo: $key"
    
    # Determinar si es sensible
    if [[ "$key" == *"SERVICE_ROLE"* ]] || [[ "$key" == *"PRIVATE"* ]]; then
        sensitive_flag="--yes"
    else
        sensitive_flag=""
    fi
    
    # Añadir para cada target
    for target in $targets; do
        if vercel env add "$key" "$target" <<< "$value" 2>/dev/null; then
            echo "   ✅ $key añadida para $target"
            ((success_count++))
        else
            echo "   ⚠️  $key ya existe para $target o hubo un error"
            ((error_count++))
        fi
    done
done

echo ""
echo "============================================================"
echo "📊 Resumen:"
echo "   ✅ Añadidas: $success_count"
echo "   ⚠️  Errores/Existentes: $error_count"
echo ""

if [ $error_count -eq 0 ]; then
    echo "✨ ¡Todas las variables se añadieron correctamente!"
    echo "💡 El próximo deployment debería funcionar correctamente."
else
    echo "⚠️  Algunas variables no se pudieron añadir. Revisa los errores arriba."
fi

