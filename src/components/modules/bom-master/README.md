# BOM Master Module

## Overview

The BOM Master module is a trial implementation of a Bill of Materials management system with strict immutability and version control. It supports three categories: SFG (Semi-Finished Goods), FG (Finished Goods), and LOCAL components.

## Features

### Core Features
- **Multiple BOM Lineages**: Each product can have multiple independent BOM lineages
- **Version Control**: Sequential versioning (v1, v2, v3...) within each lineage
- **Immutability**: Released BOMs cannot be modified or deleted
- **Audit Trail**: Complete audit trail for all changes
- **Category Support**: SFG, FG, and LOCAL categories

### Import/Export
- **Excel Import**: Bulk import BOMs from Excel/CSV files
- **Excel Export**: Export BOMs to Excel/CSV format
- **Template Download**: Pre-formatted Excel templates

### Validation
- **Business Rules**: Enforces immutability and versioning rules
- **Data Validation**: Validates product codes, categories, and component data
- **Status Transitions**: Validates allowed status transitions

## Database Schema

### Tables
- `bom_master_trial`: Main BOM records
- `bom_versions_trial`: Version history for each BOM
- `bom_components_trial`: Component details for each version
- `bom_audit_trial`: Complete audit trail

### Key Features
- **Immutability Triggers**: Prevent modification of released BOMs
- **Audit Triggers**: Automatic audit trail creation
- **Version Management**: Automatic version numbering
- **RLS Security**: Row-level security for data access

## API Endpoints

### BOM Master
- `GET /api/bom` - Get all BOM masters
- `POST /api/bom` - Create new BOM lineage
- `GET /api/bom/[id]` - Get specific BOM master
- `PUT /api/bom/[id]` - Update BOM master

### BOM Versions
- `GET /api/bom/[id]/versions` - Get versions for a BOM
- `POST /api/bom/[id]/versions` - Create new version
- `GET /api/bom/versions/[id]` - Get specific version
- `PUT /api/bom/versions/[id]` - Update version (activate)

### Audit Trail
- `GET /api/bom/audit` - Get audit trail data

## Usage

### Creating a New BOM
1. Click "New BOM" button
2. Fill in product code, name, category, and description
3. Click "Create BOM" to create a new lineage

### Adding Versions
1. Select a BOM from the list
2. Click "View Versions"
3. Click "New Version" to add components
4. Define components with quantities and costs
5. Save the version

### Releasing BOMs
1. Select a draft BOM
2. Click "Release" to make it immutable
3. Once released, only new versions can be created

### Import/Export
1. Use "Import Excel" to bulk import BOMs
2. Use "Export Excel" to export current BOMs
3. Download template for proper format

## Business Rules

### Immutability
- Draft BOMs can be modified
- Released BOMs cannot be modified or deleted
- Archived BOMs are read-only
- Only new versions can be added to released BOMs

### Versioning
- Versions are sequential (1, 2, 3...)
- Only one version can be active per lineage
- Historical versions remain accessible
- Version changes require change reason

### Categories
- **SFG**: Semi-Finished Goods
- **FG**: Finished Goods  
- **LOCAL**: Local components

## Trial Implementation

This is a trial implementation that can be completely removed before production. All data is stored in trial tables with the `_trial` suffix.

### Removal
To remove the trial implementation:
1. Drop all `*_trial` tables
2. Remove BOM Master module from module registry
3. Delete BOM Master component files

## Security

- Row-level security (RLS) enabled on all tables
- Audit trail cannot be deleted
- User context tracking for all changes
- Immutability enforced at database level

## Future Enhancements

- Component cost rollup
- BOM comparison tools
- Advanced reporting
- Integration with production planning
- Component availability tracking
