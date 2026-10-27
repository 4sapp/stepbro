<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator as ValidationValidator;

class FinanceController extends Controller
{
    private const MAX_AMOUNT = 999999999999;

    public function show(Request $request): JsonResponse
    {
        $ledger = FinanceLedger::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['state' => $this->initialState(), 'version' => 0],
        );

        return $this->response($ledger);
    }

    public function update(Request $request): JsonResponse
    {
        abort_if(strlen($request->getContent()) > 10 * 1024 * 1024, 413);

        $data = $request->validate([
            'version' => ['required', 'integer', 'min:0'],
            'state' => ['required', 'array:accounts,transactions,categories,intentions'],
            'state.accounts' => ['required', 'array', 'min:1', 'max:100'],
            'state.transactions' => ['present', 'array', 'max:10000'],
            'state.categories' => ['present', 'array', 'max:200'],
            'state.intentions' => ['present', 'array', 'max:1000'],
            'state.accounts.*' => ['required', 'array:id,name,opening,type,currency,symbol'],
            'state.accounts.*.id' => ['required', 'string', 'max:80'],
            'state.accounts.*.name' => ['required', 'string', 'max:40'],
            'state.accounts.*.opening' => ['required', 'integer', 'between:-'.self::MAX_AMOUNT.','.self::MAX_AMOUNT],
            'state.accounts.*.type' => ['required', 'in:cash,bank,savings,other'],
            'state.accounts.*.currency' => ['required', 'in:USD,MXN,EUR,COP'],
            'state.accounts.*.symbol' => ['required', 'string', 'max:12'],
            'state.transactions.*' => ['required', 'array:id,type,amount,accountId,currency,description,category,date,time,note,destinationId,destinationAmount,destinationCurrency,createdAt,location'],
            'state.transactions.*.id' => ['required', 'string', 'max:80'],
            'state.transactions.*.type' => ['required', 'in:income,expense,transfer'],
            'state.transactions.*.amount' => ['required', 'integer', 'min:1', 'max:'.self::MAX_AMOUNT],
            'state.transactions.*.accountId' => ['present', 'string', 'max:80'],
            'state.transactions.*.currency' => ['required', 'in:USD,MXN,EUR,COP'],
            'state.transactions.*.description' => ['present', 'string', 'max:120'],
            'state.transactions.*.category' => ['present', 'string', 'max:80'],
            'state.transactions.*.date' => ['required', 'date_format:Y-m-d'],
            'state.transactions.*.time' => ['present', 'string', 'regex:/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/'],
            'state.transactions.*.note' => ['present', 'string', 'max:1000'],
            'state.transactions.*.destinationId' => ['present', 'string', 'max:80'],
            'state.transactions.*.destinationAmount' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_AMOUNT],
            'state.transactions.*.destinationCurrency' => ['nullable', 'in:USD,MXN,EUR,COP'],
            'state.transactions.*.createdAt' => ['required', 'integer', 'min:0'],
            'state.transactions.*.location' => ['sometimes', 'array:latitude,longitude,accuracy'],
            'state.transactions.*.location.latitude' => ['required_with:state.transactions.*.location', 'numeric', 'between:-90,90'],
            'state.transactions.*.location.longitude' => ['required_with:state.transactions.*.location', 'numeric', 'between:-180,180'],
            'state.transactions.*.location.accuracy' => ['required_with:state.transactions.*.location', 'numeric', 'min:0'],
            'state.categories.*' => ['required', 'array:id,name,description,symbol'],
            'state.categories.*.id' => ['required', 'string', 'max:80'],
            'state.categories.*.name' => ['required', 'string', 'max:40'],
            'state.categories.*.description' => ['present', 'string', 'max:400'],
            'state.categories.*.symbol' => ['required', 'string', 'max:12'],
            'state.intentions.*' => ['required', 'array:id,name,amount,frequency,date,note,category,accountId,destinationId,currency,paused'],
            'state.intentions.*.id' => ['required', 'string', 'max:80'],
            'state.intentions.*.name' => ['required', 'string', 'max:120'],
            'state.intentions.*.amount' => ['required', 'integer', 'min:1', 'max:'.self::MAX_AMOUNT],
            'state.intentions.*.frequency' => ['required', 'in:once,daily,weekly,fortnightly,monthly,yearly'],
            'state.intentions.*.date' => ['required', 'date_format:Y-m-d'],
            'state.intentions.*.note' => ['present', 'string', 'max:1000'],
            'state.intentions.*.category' => ['present', 'string', 'max:80'],
            'state.intentions.*.accountId' => ['present', 'string', 'max:80'],
            'state.intentions.*.destinationId' => ['present', 'string', 'max:80'],
            'state.intentions.*.currency' => ['required', 'in:USD,MXN,EUR,COP'],
            'state.intentions.*.paused' => ['required', 'boolean'],
        ]);

        $this->validateIntegerTypes($data);
        $this->validateReferences($data['state']);

        $ledger = DB::transaction(function () use ($request, $data) {
            FinanceLedger::firstOrCreate(
                ['user_id' => $request->user()->id],
                ['state' => $this->initialState(), 'version' => 0],
            );

            $ledger = FinanceLedger::where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();

            if ($ledger->version !== (int) $data['version']) {
                return null;
            }

            $ledger->state = $data['state'];
            $ledger->version++;
            $ledger->save();

            return $ledger;
        });

        if (! $ledger) {
            return response()->json(['message' => 'Los datos cambiaron en otra sesión.'], 409);
        }

        return $this->response($ledger);
    }

    private function validateReferences(array $state): void
    {
        $validator = Validator::make([], []);
        $validator->after(function (ValidationValidator $validator) use ($state): void {
            $accounts = collect($state['accounts'])->keyBy('id');
            $categories = collect($state['categories'])->keyBy('id');

            foreach (['accounts', 'transactions', 'categories', 'intentions'] as $collection) {
                $ids = array_column($state[$collection], 'id');
                if (count($ids) !== count(array_unique($ids))) {
                    $validator->errors()->add("state.$collection", 'Los identificadores deben ser únicos.');
                }
            }

            foreach ($state['transactions'] as $index => $transaction) {
                $account = $accounts->get($transaction['accountId']);
                if (($transaction['accountId'] !== '' && ! $account) || ($account && $account['currency'] !== $transaction['currency'])) {
                    $validator->errors()->add("state.transactions.$index.accountId", 'La cuenta del movimiento no es válida.');
                }
                if ($transaction['category'] !== '' && ! $categories->has($transaction['category'])) {
                    $validator->errors()->add("state.transactions.$index.category", 'La categoría del movimiento no es válida.');
                }

                if ($transaction['type'] === 'transfer') {
                    $destination = $accounts->get($transaction['destinationId']);
                    if (! $account || ! $destination || $transaction['accountId'] === $transaction['destinationId']) {
                        $validator->errors()->add("state.transactions.$index.destinationId", 'Las cuentas de la transferencia no son válidas.');
                    } elseif ($destination['currency'] !== ($transaction['destinationCurrency'] ?? null)) {
                        $validator->errors()->add("state.transactions.$index.destinationCurrency", 'La moneda de destino no coincide con la cuenta.');
                    } elseif ($destination['currency'] === $account['currency'] && ($transaction['destinationAmount'] ?? null) !== $transaction['amount']) {
                        $validator->errors()->add("state.transactions.$index.destinationAmount", 'Las transferencias en la misma moneda deben conservar el importe.');
                    } elseif ($destination['currency'] !== $account['currency'] && empty($transaction['destinationAmount'])) {
                        $validator->errors()->add("state.transactions.$index.destinationAmount", 'Indica el importe recibido por la cuenta de destino.');
                    }
                } elseif ($transaction['destinationId'] !== '' || isset($transaction['destinationAmount']) || isset($transaction['destinationCurrency'])) {
                    $validator->errors()->add("state.transactions.$index.destinationId", 'Solo las transferencias pueden tener una cuenta de destino.');
                }
            }

            foreach ($state['intentions'] as $index => $intention) {
                if ($intention['category'] !== '' && ! $categories->has($intention['category'])) {
                    $validator->errors()->add("state.intentions.$index.category", 'La categoría de la intención no es válida.');
                }
                foreach (['accountId', 'destinationId'] as $key) {
                    if ($intention[$key] !== '' && ! $accounts->has($intention[$key])) {
                        $validator->errors()->add("state.intentions.$index.$key", 'La cuenta de la intención no es válida.');
                    }
                }
                if ($intention['destinationId'] !== '' && $intention['destinationId'] === $intention['accountId']) {
                    $validator->errors()->add("state.intentions.$index.destinationId", 'El destino debe ser una cuenta diferente.');
                }
                $account = $intention['accountId'] === '' ? null : $accounts->get($intention['accountId']);
                if ($account && $account['currency'] !== $intention['currency']) {
                    $validator->errors()->add("state.intentions.$index.currency", 'La moneda no coincide con la cuenta.');
                }
            }
        });
        $validator->validate();
    }

    private function validateIntegerTypes(array $data): void
    {
        $errors = [];
        $check = static function (mixed $value, string $path) use (&$errors): void {
            if (! is_int($value)) {
                $errors[$path] = 'El valor debe ser un número entero.';
            }
        };

        $check($data['version'], 'version');
        foreach ($data['state']['accounts'] as $index => $account) {
            $check($account['opening'], "state.accounts.$index.opening");
        }
        foreach ($data['state']['transactions'] as $index => $transaction) {
            $check($transaction['amount'], "state.transactions.$index.amount");
            $check($transaction['createdAt'], "state.transactions.$index.createdAt");
            if (isset($transaction['destinationAmount'])) {
                $check($transaction['destinationAmount'], "state.transactions.$index.destinationAmount");
            }
        }
        foreach ($data['state']['intentions'] as $index => $intention) {
            $check($intention['amount'], "state.intentions.$index.amount");
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function response(FinanceLedger $ledger): JsonResponse
    {
        return response()->json(['state' => $ledger->state, 'version' => $ledger->version]);
    }

    private function initialState(): array
    {
        return [
            'accounts' => [['id' => 'cash', 'name' => 'Efectivo', 'opening' => 0, 'type' => 'cash', 'currency' => 'USD', 'symbol' => '💵']],
            'transactions' => [],
            'categories' => [
                ['id' => 'food', 'name' => 'Alimentos', 'symbol' => '🍔', 'description' => ''],
                ['id' => 'home', 'name' => 'Hogar', 'symbol' => '🏠', 'description' => ''],
                ['id' => 'transport', 'name' => 'Transporte', 'symbol' => '🚗', 'description' => ''],
                ['id' => 'leisure', 'name' => 'Ocio', 'symbol' => '🎟️', 'description' => ''],
                ['id' => 'health', 'name' => 'Salud', 'symbol' => '💊', 'description' => ''],
                ['id' => 'salary', 'name' => 'Sueldo', 'symbol' => '💼', 'description' => ''],
                ['id' => 'other', 'name' => 'Otros', 'symbol' => '✳', 'description' => ''],
            ],
            'intentions' => [],
        ];
    }
}
