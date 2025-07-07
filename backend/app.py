from flask import Flask, request, jsonify, send_file, render_template, Response
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
import io
import base64
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# --- Robust Numpy JSON Encoder and NaN Cleaner ---
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        return super(NumpyEncoder, self).default(obj)

def clean_nans(obj):
    """Recursively convert NaN, inf, -inf to None in dicts/lists."""
    if isinstance(obj, dict):
        return {k: clean_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nans(v) for v in obj]
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif pd.isna(obj):
        return None
    return obj

# Import modules
from modules.data_processor import DataProcessor
from modules.eda_analyzer import EDAAnalyzer
from modules.statistical_tests import StatisticalTests
from modules.feature_engineering import FeatureEngineering
from modules.visualizations import Visualizations
from modules.recommendations import RecommendationEngine

# Correct paths to frontend folders
app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend'),
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend')
)

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Enhanced CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5000", "http://127.0.0.1:5000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True
    }
})

# Global variables to store session data
sessions = {}
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
PLOTS_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'plots')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PLOTS_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST', 'OPTIONS'])
@app.route('/upload/', methods=['POST', 'OPTIONS'])
def upload_file():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, f"{session_id}_{filename}")
        file.save(file_path)

        # Process the file
        processor = DataProcessor()
        df, file_info = processor.load_file(file_path)

        # Store in session
        sessions[session_id] = {
            'dataframe': df,
            'file_info': file_info,
            'original_columns': df.columns.tolist(),
            'upload_time': datetime.now().isoformat(),
            'file_path': file_path
        }

        # Generate preview
        preview = processor.generate_preview(df)

        # Clean NaN/inf values for JSON
        response_data = {
            'session_id': session_id,
            'file_info': clean_nans(file_info),
            'preview': clean_nans(preview),
            'columns': df.columns.tolist(),
            'dtypes': df.dtypes.astype(str).to_dict(),
            'shape': list(df.shape)
        }
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
    except Exception as e:
        logging.exception('Upload failed')
        return jsonify({'error': str(e)}), 500

@app.route('/eda/<session_id>', methods=['GET', 'OPTIONS'])
def generate_eda(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        df = sessions[session_id]['dataframe']
        analyzer = EDAAnalyzer()
        
        # Generate comprehensive EDA
        eda_results = analyzer.generate_full_eda(df)
        
        # Generate visualizations
        viz = Visualizations()
        plots = viz.generate_eda_plots(df, session_id)
        
        # Generate recommendations
        recommender = RecommendationEngine()
        recommendations = recommender.generate_eda_recommendations(df, eda_results)
        
        response_data = {
            'eda_results': clean_nans(eda_results),
            'plots': clean_nans(plots),
            'recommendations': clean_nans(recommendations)
        }
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('EDA generation failed')
        return jsonify({'error': str(e)}), 500

@app.route('/generate_insights/<session_id>', methods=['POST', 'OPTIONS'])
def generate_insights(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json or {}
        df = sessions[session_id]['dataframe']
        
        # Generate AI-powered insights
        insights = []
        
        # 1. Data quality insights
        missing_data = df.isnull().sum()
        for col in missing_data[missing_data > 0].index:
            missing_pct = (missing_data[col] / len(df)) * 100
            priority = 'critical' if missing_pct > 50 else 'high' if missing_pct > 20 else 'medium'
            
            insights.append({
                'id': f'missing_{col}_{len(insights)}',
                'title': f'Missing Values in {col}',
                'description': f'{missing_pct:.1f}% of values are missing in column {col}',
                'category': 'data_quality', 
                'priority': priority,
                'affected_columns': [col],
                'key_findings': [
                    f'{missing_data[col]} out of {len(df)} rows have missing values',
                    f'This represents {missing_pct:.1f}% of the total data'
                ],
                'recommendation': f'Consider imputation strategies for {col}' if missing_pct < 70 else f'Consider removing column {col} due to high missing rate',
                'statistical_data': {
                    'missing_count': int(missing_data[col]),
                    'missing_percentage': float(missing_pct),
                    'total_rows': len(df)
                },
                'actions': [
                    {
                        'type': 'impute',
                        'label': 'Apply Imputation',
                        'description': 'Fill missing values using statistical methods',
                        'automated': True
                    }
                ],
                'timestamp': datetime.now().timestamp(),
                'confidence': 0.9,
                'risk_level': 'low'
            })

        # 2. Correlation insights
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            
            # Find high correlations
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    corr_val = corr_matrix.iloc[i, j]
                    if abs(corr_val) > 0.8:  
                        col1, col2 = corr_matrix.columns[i], corr_matrix.columns[j]
                        insights.append({
                            'id': f'corr_{col1}_{col2}_{len(insights)}',
                            'title': f'High Correlation: {col1} vs {col2}',
                            'description': f'Strong correlation ({corr_val:.2f}) detected between {col1} and {col2}',
                            'category': 'correlations',
                            'priority': 'medium',
                            'affected_columns': [col1, col2],
                            'key_findings': [
                                f'Correlation coefficient: {corr_val:.3f}',
                                'This suggests potential multicollinearity'
                            ],
                            'recommendation': 'Consider feature selection or dimensionality reduction',
                            'statistical_data': {
                                'correlation': float(corr_val),
                                'significance': 'high' if abs(corr_val) > 0.9 else 'medium'
                            },
                            'actions': [
                                {
                                    'type': 'feature_selection',
                                    'label': 'Apply Feature Selection',
                                    'description': 'Remove one of the highly correlated features',
                                    'automated': True
                                }
                            ],
                            'timestamp': datetime.now().timestamp(),
                            'confidence': 0.85,
                            'risk_level': 'low'
                        })

        # 3. Outlier detection insights
        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            
            if len(outliers) > 0:
                outlier_pct = (len(outliers) / len(df)) * 100
                insights.append({
                    'id': f'outliers_{col}_{len(insights)}',
                    'title': f'Outliers Detected in {col}',
                    'description': f'{len(outliers)} outliers ({outlier_pct:.1f}%) detected in {col}',
                    'category': 'outliers',
                    'priority': 'low' if outlier_pct < 5 else 'medium',
                    'affected_columns': [col],
                    'key_findings': [
                        f'{len(outliers)} outliers found',
                        f'Range: {df[col].min():.2f} to {df[col].max():.2f}',
                        f'Outlier threshold: < {lower_bound:.2f} or > {upper_bound:.2f}'
                    ],
                    'recommendation': 'Consider outlier treatment: capping, transformation, or removal',
                    'statistical_data': {
                        'outlier_count': len(outliers),
                        'outlier_percentage': outlier_pct,
                        'lower_bound': lower_bound,
                        'upper_bound': upper_bound
                    },
                    'actions': [
                        {
                            'type': 'remove_outliers',
                            'label': 'Remove Outliers',
                            'description': 'Remove detected outliers',
                            'automated': True
                        }
                    ],
                    'timestamp': datetime.now().timestamp(),
                    'confidence': 0.75,
                    'risk_level': 'medium' if outlier_pct > 5 else 'low'
                })

        # 4. Data type recommendations
        for col in df.columns:
            if df[col].dtype == 'object':
                unique_ratio = df[col].nunique() / len(df)
                if unique_ratio < 0.05:
                    insights.append({
                        'id': f'dtype_{col}_{len(insights)}',
                        'title': f'Convert {col} to Categorical',
                        'description': f'Column {col} has low cardinality ({unique_ratio:.1%}), consider converting to categorical',
                        'category': 'feature_engineering',
                        'priority': 'low',
                        'affected_columns': [col],
                        'key_findings': [
                            f'Unique values: {df[col].nunique()}',
                            f'Cardinality ratio: {unique_ratio:.1%}'
                        ],
                        'recommendation': 'Convert to categorical type for memory efficiency',
                        'statistical_data': {
                            'unique_count': df[col].nunique(),
                            'cardinality_ratio': unique_ratio
                        },
                        'actions': [
                            {
                                'type': 'convert_categorical',
                                'label': 'Convert to Categorical',
                                'description': 'Convert to pandas categorical type',
                                'automated': True
                            }
                        ],
                        'timestamp': datetime.now().timestamp(),
                        'confidence': 0.8,
                        'risk_level': 'low'
                    })

        response_data = {'insights': clean_nans(insights)}
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Insights generation failed')
        return jsonify({'error': str(e)}), 500

@app.route('/analyze_column/<session_id>', methods=['POST', 'OPTIONS'])
def analyze_column(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        column_name = data.get('column')
        analysis_type = data.get('analysis_type', 'univariate')
        
        df = sessions[session_id]['dataframe']
        analyzer = EDAAnalyzer()
        
        if analysis_type == 'univariate':
            results = analyzer.univariate_analysis(df, column_name)
        elif analysis_type == 'bivariate':
            target_column = data.get('target_column')
            results = analyzer.bivariate_analysis(df, column_name, target_column)
        else:
            return jsonify({'error': 'Invalid analysis type'}), 400
        
        # Generate column-specific visualizations
        viz = Visualizations()
        plots = viz.generate_column_plots(df, column_name, session_id, analysis_type)
        
        response_data = {
            'analysis_results': clean_nans(results),
            'plots': clean_nans(plots)
        }
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Column analysis failed')
        return jsonify({'error': str(e)}), 500

@app.route('/statistical_tests/<session_id>', methods=['POST', 'OPTIONS'])
def run_statistical_tests(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        test_type = data.get('test_type')
        columns = data.get('columns', [])
        
        df = sessions[session_id]['dataframe']
        tester = StatisticalTests()
        
        results = tester.run_test(df, test_type, columns)
        
        response_data = {'test_results': clean_nans(results)}
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Statistical test failed')
        return jsonify({'error': str(e)}), 500

@app.route('/apply_transformation/<session_id>', methods=['POST', 'OPTIONS'])
def apply_transformation(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
            
        data = request.json
        columns = data.get('columns', [])
        transformation = data.get('transformation')
        parameters = data.get('parameters', {})
        
        if not columns:
            return jsonify({'error': 'No columns provided'}), 400
        if not transformation:
            return jsonify({'error': 'No transformation provided'}), 400
        
        df = sessions[session_id]['dataframe']
        fe = FeatureEngineering()
        
        transformed_df = df.copy()
        transformation_infos = []
        
        for column in columns:
            try:
                if transformation == 'scaling':
                    # Handle scaling transformation
                    method = parameters.get('method', 'standard')
                    if method == 'standard':
                        from sklearn.preprocessing import StandardScaler
                        scaler = StandardScaler()
                        transformed_df[column] = scaler.fit_transform(transformed_df[[column]]).flatten()
                    elif method == 'minmax':
                        from sklearn.preprocessing import MinMaxScaler
                        scaler = MinMaxScaler()
                        transformed_df[column] = scaler.fit_transform(transformed_df[[column]]).flatten()
                    
                    transformation_info = {
                        'transformation': transformation,
                        'method': method,
                        'column': column,
                        'status': 'success'
                    }
                else:
                    # Use the FeatureEngineering class for other transformations
                    transformed_df, transformation_info = fe.apply_transformation(
                        transformed_df, column, transformation, parameters
                    )
                    
                transformation_infos.append({
                    'column': column,
                    'info': transformation_info
                })
                
            except Exception as e:
                return jsonify({'error': f'Error transforming column {column}: {str(e)}'}), 500
        
        # Update session with transformed data
        sessions[session_id]['dataframe'] = transformed_df
        
        response_data = {
            'success': True,
            'transformation_infos': clean_nans(transformation_infos),
            'updated_shape': transformed_df.shape
        }
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Transformation failed')
        return jsonify({'error': str(e)}), 500

@app.route('/compare_columns/<session_id>', methods=['POST', 'OPTIONS'])
def compare_columns(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        columns = data.get('columns', [])
        
        if len(columns) < 2:
            return jsonify({'error': 'At least 2 columns required for comparison'}), 400
        
        df = sessions[session_id]['dataframe']
        analyzer = EDAAnalyzer()
        
        # Perform comparison analysis
        comparison_results = analyzer.compare_columns(df, columns)
        
        # Generate comparison visualizations
        viz = Visualizations()
        comparison_plots = viz.generate_comparison_plots(df, columns, session_id)
        
        # Generate recommendations
        recommender = RecommendationEngine()
        recommendations = recommender.generate_comparison_recommendations(
            df, columns, comparison_results
        )
        
        response_data = {
            'comparison_results': clean_nans(comparison_results),
            'plots': clean_nans(comparison_plots),
            'recommendations': clean_nans(recommendations)
        }
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Column comparison failed')
        return jsonify({'error': str(e)}), 500

@app.route('/export_report/<session_id>', methods=['GET', 'OPTIONS'])
def export_report(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        df = sessions[session_id]['dataframe']
        
        # Generate comprehensive report
        from modules.recommendations import ReportGenerator
        report_gen = ReportGenerator()
        
        report_path = report_gen.generate_html_report(df, session_id)
        
        return send_file(report_path, as_attachment=True)
        
    except Exception as e:
        logging.exception('Report generation failed')
        return jsonify({'error': str(e)}), 500

@app.route('/get_recommendations/<session_id>', methods=['GET', 'OPTIONS'])
def get_recommendations(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        df = sessions[session_id]['dataframe']
        recommender = RecommendationEngine()
        
        recommendations = recommender.generate_comprehensive_recommendations(df)
        
        response_data = {'recommendations': clean_nans(recommendations)}
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Recommendations failed')
        return jsonify({'error': str(e)}), 500

# Additional missing endpoints
@app.route('/generate_chart/<session_id>', methods=['POST', 'OPTIONS'])
def generate_chart(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        chart_type = data.get('chart_type')
        columns = data.get('columns', [])
        settings = data.get('settings', {})
        
        df = sessions[session_id]['dataframe']
        
        # Generate mock chart data for now
        chart_data = []
        
        if chart_type == 'histogram' and len(columns) > 0:
            col = columns[0]
            if pd.api.types.is_numeric_dtype(df[col]):
                chart_data = [{
                    'x': df[col].dropna().tolist(),
                    'type': 'histogram',
                    'name': col
                }]
        elif chart_type == 'scatter' and len(columns) >= 2:
            col1, col2 = columns[0], columns[1]
            if pd.api.types.is_numeric_dtype(df[col1]) and pd.api.types.is_numeric_dtype(df[col2]):
                chart_data = [{
                    'x': df[col1].dropna().tolist(),
                    'y': df[col2].dropna().tolist(),
                    'mode': 'markers',
                    'type': 'scatter',
                    'name': f'{col1} vs {col2}'
                }]
        
        response_data = {'chart_data': clean_nans(chart_data)}
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Chart generation failed')
        return jsonify({'error': str(e)}), 500

# Add these endpoints to your app.py

@app.route('/execute_insight_action/<session_id>', methods=['POST', 'OPTIONS'])
def execute_insight_action(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        insight_id = data.get('insight_id')
        action_type = data.get('action_type')
        insight_data = data.get('insight_data', {})
        
        df = sessions[session_id]['dataframe']
        
        # Execute different actions based on type
        result = {'success': True, 'message': f'Action {action_type} executed successfully'}
        
        if action_type == 'impute':
            # Handle imputation
            affected_columns = insight_data.get('affected_columns', [])
            for col in affected_columns:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    df[col].fillna(df[col].mean(), inplace=True)
                elif col in df.columns:
                    df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else 'Unknown', inplace=True)
            
            # Update session
            sessions[session_id]['dataframe'] = df
            result['affected_rows'] = len(affected_columns)
            
        elif action_type == 'remove_outliers':
            # Handle outlier removal
            affected_columns = insight_data.get('affected_columns', [])
            original_length = len(df)
            
            for col in affected_columns:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
            
            # Update session
            sessions[session_id]['dataframe'] = df
            result['rows_removed'] = original_length - len(df)
            
        elif action_type == 'feature_selection':
            # Handle feature selection
            affected_columns = insight_data.get('affected_columns', [])
            if len(affected_columns) >= 2:
                # Remove one of the highly correlated columns (keep the first one)
                col_to_remove = affected_columns[1]
                if col_to_remove in df.columns:
                    df.drop(columns=[col_to_remove], inplace=True)
                    sessions[session_id]['dataframe'] = df
                    result['removed_column'] = col_to_remove
            
        elif action_type == 'convert_categorical':
            # Convert to categorical
            affected_columns = insight_data.get('affected_columns', [])
            for col in affected_columns:
                if col in df.columns:
                    df[col] = df[col].astype('category')
            
            sessions[session_id]['dataframe'] = df
            result['converted_columns'] = affected_columns
            
        else:
            result = {'success': False, 'error': f'Unknown action type: {action_type}'}
        
        response_data = clean_nans(result)
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Action execution failed')
        return jsonify({'error': str(e)}), 500

@app.route('/export_data/<session_id>', methods=['POST', 'OPTIONS'])
def export_data(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        format_type = data.get('format', 'csv')
        include_processed = data.get('include_processed', True)
        
        df = sessions[session_id]['dataframe']
        
        # Create export file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"exported_data_{timestamp}.{format_type}"
        export_path = os.path.join(UPLOAD_FOLDER, filename)
        
        if format_type == 'csv':
            df.to_csv(export_path, index=False)
        elif format_type == 'json':
            df.to_json(export_path, orient='records', indent=2)
        elif format_type == 'xlsx':
            df.to_excel(export_path, index=False)
        else:
            return jsonify({'error': f'Unsupported format: {format_type}'}), 400
        
        # Return download URL
        download_url = f"/download_file/{session_id}/{filename}"
        
        response_data = {
            'success': True,
            'download_url': download_url,
            'filename': filename
        }
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Data export failed')
        return jsonify({'error': str(e)}), 500

@app.route('/download_file/<session_id>/<filename>', methods=['GET'])
def download_file(session_id, filename):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=filename)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        logging.exception('File download failed')
        return jsonify({'error': str(e)}), 500

@app.route('/generate_insights_report/<session_id>', methods=['POST', 'OPTIONS'])
def generate_insights_report(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        insights = data.get('insights', [])
        include_visualizations = data.get('include_visualizations', True)
        format_type = data.get('format', 'html')
        
        # Create a simple HTML report
        report_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Insights Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .insight {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
                .insight h3 {{ color: #333; }}
                .priority-high {{ border-left: 4px solid #f44336; }}
                .priority-medium {{ border-left: 4px solid #ff9800; }}
                .priority-low {{ border-left: 4px solid #4caf50; }}
            </style>
        </head>
        <body>
            <h1>Data Insights Report</h1>
            <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>Session ID: {session_id}</p>
            
            <h2>Summary</h2>
            <p>Total insights: {len(insights)}</p>
            
            <h2>Detailed Insights</h2>
        """
        
        for insight in insights:
            priority = insight.get('priority', 'low')
            report_html += f"""
            <div class="insight priority-{priority}">
                <h3>{insight.get('title', 'Unnamed Insight')}</h3>
                <p><strong>Priority:</strong> {priority.title()}</p>
                <p><strong>Category:</strong> {insight.get('category', 'Unknown')}</p>
                <p><strong>Description:</strong> {insight.get('description', 'No description')}</p>
                <p><strong>Recommendation:</strong> {insight.get('recommendation', 'No recommendation')}</p>
            </div>
            """
        
        report_html += """
        </body>
        </html>
        """
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"insights_report_{timestamp}.html"
        report_path = os.path.join(UPLOAD_FOLDER, filename)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_html)
        
        download_url = f"/download_file/{session_id}/{filename}"
        
        response_data = {
            'success': True,
            'download_url': download_url,
            'filename': filename
        }
        
        return Response(
            json.dumps(response_data, cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Insights report generation failed')
        return jsonify({'error': str(e)}), 500
    
@app.route('/export_report/<session_id>', methods=['GET', 'OPTIONS'],endpoint='export_report_custom')
def export_report(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        df = sessions[session_id]['dataframe']
        
        # Create a simple HTML report instead of using ReportGenerator
        report_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>EDA Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>Exploratory Data Analysis Report</h1>
            <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            
            <div class="section">
                <h2>Dataset Overview</h2>
                <p><strong>Shape:</strong> {df.shape[0]} rows × {df.shape[1]} columns</p>
                <p><strong>Memory Usage:</strong> {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB</p>
                <p><strong>Missing Values:</strong> {df.isnull().sum().sum()}</p>
                <p><strong>Duplicate Rows:</strong> {df.duplicated().sum()}</p>
            </div>
            
            <div class="section">
                <h2>Column Information</h2>
                <table>
                    <tr>
                        <th>Column</th>
                        <th>Data Type</th>
                        <th>Missing Values</th>
                        <th>Unique Values</th>
                    </tr>
        """
        
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            unique_count = df[col].nunique()
            report_html += f"""
                    <tr>
                        <td>{col}</td>
                        <td>{df[col].dtype}</td>
                        <td>{missing_count}</td>
                        <td>{unique_count}</td>
                    </tr>
            """
        
        report_html += """
                </table>
            </div>
        </body>
        </html>
        """
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"eda_report_{timestamp}.html"
        report_path = os.path.join(UPLOAD_FOLDER, filename)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_html)
        
        return send_file(report_path, as_attachment=True, download_name=filename)
        
    except Exception as e:
        logging.exception('Report generation failed')
        return jsonify({'error': str(e)}), 500

@app.route('/analyze_correlations/<session_id>', methods=['POST', 'OPTIONS'])
def analyze_correlations(session_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        columns = data.get('columns', [])
        
        df = sessions[session_id]['dataframe']
        analyzer = EDAAnalyzer()
        
        # Filter to numeric columns if specific columns requested
        if columns:
            available_columns = [col for col in columns if col in df.columns]
            if available_columns:
                df_subset = df[available_columns]
            else:
                return jsonify({'error': 'No valid columns found'}), 400
        else:
            df_subset = df
        
        # Get correlation analysis
        correlation_results = analyzer._analyze_correlations(df_subset)
        
        # Generate PCA analysis if enough numeric columns
        numeric_cols = df_subset.select_dtypes(include=[np.number]).columns
        pca_analysis = {}
        if len(numeric_cols) >= 2:
            try:
                from sklearn.decomposition import PCA
                from sklearn.preprocessing import StandardScaler
                
                # Prepare data for PCA
                numeric_data = df_subset[numeric_cols].dropna()
                if len(numeric_data) > 0:
                    scaler = StandardScaler()
                    scaled_data = scaler.fit_transform(numeric_data)
                    
                    # Perform PCA
                    pca = PCA()
                    pca.fit(scaled_data)
                    
                    pca_analysis = {
                        'explained_variance_ratio': pca.explained_variance_ratio_.tolist(),
                        'cumulative_variance_ratio': np.cumsum(pca.explained_variance_ratio_).tolist(),
                        'components': pca.components_.tolist(),
                        'n_components': len(pca.explained_variance_ratio_)
                    }
            except Exception as e:
                pca_analysis = {'error': f'PCA analysis failed: {str(e)}'}
        
        # Generate recommendations
        recommendations = []
        if 'high_correlations' in correlation_results:
            for corr_pair in correlation_results['high_correlations']:
                recommendations.append({
                    'type': 'correlation',
                    'message': f"High correlation ({corr_pair['correlation']}) between {corr_pair['column1']} and {corr_pair['column2']}",
                    'severity': 'medium',
                    'action': 'Consider removing one of these variables to avoid multicollinearity'
                })
        
        response_data = {
            'correlation_matrix': correlation_results,
            'pca_analysis': pca_analysis,
            'recommendations': recommendations
        }
        
        return Response(
            json.dumps(clean_nans(response_data), cls=NumpyEncoder, allow_nan=False), 
            mimetype='application/json'
        )
        
    except Exception as e:
        logging.exception('Correlation analysis failed')
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)