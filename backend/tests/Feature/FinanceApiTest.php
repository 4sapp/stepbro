<?php

namespace Tests\Feature;

use App\Models\FinanceLedger;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_is_private_per_user_and_starts_with_frontend_defaults(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        $payload = $this->actingAs($first)->getJson('/api/finance')->assertOk()->json();
        $this->assertSame('cash', $payload['state']['accounts'][0]['id']);
        $this->assertSame('food', $payload['state']['categories'][0]['id']);
        $this->assertSame(0, $payload['version']);

        $this->actingAs($second)->getJson('/api/finance')->assertOk()
            ->assertJsonPath('state.accounts.0.id', 'cash')
            ->assertJsonPath('version', 0);

        $this->assertSame(2, FinanceLedger::query()->count());
    }

    public function test_finance_read_and_write_require_authentication(): void
    {
        $this->getJson('/api/finance')->assertUnauthorized();
        $this->putJson('/api/finance', ['state' => [], 'version' => 0])->assertUnauthorized();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_a_valid_save_persists_the_movement_and_advances_version(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/finance')->assertOk();

        $state = $this->stateWithMovement();
        $this->putJson('/api/finance', ['state' => $state, 'version' => 0])
            ->assertOk()
            ->assertJsonPath('version', 1)
            ->assertJsonPath('state.transactions.0.amount', 2599);

        $this->getJson('/api/finance')->assertOk()
            ->assertJsonPath('version', 1)
            ->assertJsonPath('state.transactions.0.description', 'Mercado');
    }

    public function test_a_stale_version_is_rejected_without_overwriting_the_ledger(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/finance')->assertOk();
        $state = $this->stateWithMovement();

        $this->putJson('/api/finance', ['state' => $state, 'version' => 0])->assertOk();
        $this->putJson('/api/finance', ['state' => $this->initialState(), 'version' => 0])->assertConflict();

        $this->getJson('/api/finance')->assertJsonPath('version', 1)
            ->assertJsonPath('state.transactions.0.id', 'movement-1');
    }

    public function test_invalid_amount_and_foreign_account_references_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/finance')->assertOk();

        $state = $this->stateWithMovement();
        $state['transactions'][0]['amount'] = 0;
        $this->putJson('/api/finance', ['state' => $state, 'version' => 0])->assertUnprocessable();

        $state = $this->stateWithMovement();
        $state['transactions'][0]['amount'] = '2599';
        $this->putJson('/api/finance', ['state' => $state, 'version' => 0])->assertUnprocessable();

        $state = $this->stateWithMovement();
        $state['transactions'][0]['accountId'] = 'another-users-account';
        $this->putJson('/api/finance', ['state' => $state, 'version' => 0])->assertUnprocessable();

        $this->getJson('/api/finance')->assertJsonPath('version', 0);
    }

    public function test_an_unassigned_movement_can_keep_an_empty_account_id(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/finance')->assertOk();
        $state = $this->stateWithMovement();
        $state['transactions'][0]['type'] = 'income';
        $state['transactions'][0]['accountId'] = '';
        $state['transactions'][0]['currency'] = 'COP';

        $this->putJson('/api/finance', ['state' => $state, 'version' => 0])
            ->assertOk()
            ->assertJsonPath('state.transactions.0.accountId', '');
    }

    public function test_registration_login_and_logout_use_a_session(): void
    {
        config(['sanctum.stateful' => ['localhost:5174']]);
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->withHeader('Origin', 'http://localhost:5174')
            ->postJson('/api/register', [
                'name' => 'Ada',
                'email' => 'ada@example.test',
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ])->assertCreated()->assertJsonPath('email', 'ada@example.test');

        $this->postJson('/api/logout')->assertOk();
        $this->getJson('/api/user')->assertUnauthorized();

        $this->postJson('/api/login', ['email' => 'ada@example.test', 'password' => 'password123'])
            ->assertOk()->assertJsonPath('name', 'Ada');
        $this->getJson('/api/user')->assertOk()->assertJsonPath('email', 'ada@example.test');
    }

    private function stateWithMovement(): array
    {
        $state = $this->initialState();
        $state['transactions'][] = [
            'id' => 'movement-1',
            'type' => 'expense',
            'amount' => 2599,
            'accountId' => 'cash',
            'currency' => 'USD',
            'description' => 'Mercado',
            'category' => 'food',
            'date' => '2026-10-27',
            'time' => '',
            'note' => '',
            'destinationId' => '',
            'createdAt' => 1,
        ];

        return $state;
    }

    private function initialState(): array
    {
        return [
            'accounts' => [['id' => 'cash', 'name' => 'Efectivo', 'opening' => 0, 'type' => 'cash', 'currency' => 'USD', 'symbol' => '💵']],
            'transactions' => [],
            'categories' => [['id' => 'food', 'name' => 'Alimentos', 'symbol' => '🍔', 'description' => '']],
            'intentions' => [],
        ];
    }
}
