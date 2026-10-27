<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinanceLedger extends Model
{
    protected $fillable = ['user_id', 'state', 'version'];

    protected function casts(): array
    {
        return ['state' => 'array', 'version' => 'integer'];
    }
}
