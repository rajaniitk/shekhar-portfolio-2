import pandas as pd
import numpy as np
import json
from typing import Tuple, Dict, Any

class DataProcessor:
    def __init__(self):
        self.supported_formats = ['.csv', '.json', '.xlsx', '.parquet']
    
    def load_file(self, file_path: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Load file and return DataFrame with file info"""
        file_extension = file_path.lower().split('.')[-1]
        
        try:
            if file_extension == 'csv':
                df = pd.read_csv(file_path)
            elif file_extension == 'json':
                df = pd.read_json(file_path)
            elif file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file_path)
            elif file_extension == 'parquet':
                df = pd.read_parquet(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            # Clean column names
            df.columns = self._clean_column_names(df.columns)
            
            file_info = {
                'filename': file_path.split('/')[-1],
                'format': file_extension,
                'size_mb': round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
                'shape': df.shape,
                'columns': df.columns.tolist()
            }
            
            return df, file_info
            
        except Exception as e:
            raise Exception(f"Error loading file: {str(e)}")
    
    def _clean_column_names(self, columns):
        """Clean column names by removing special characters"""
        cleaned = []
        for col in columns:
            # Remove special characters and replace spaces with underscores
            clean_col = str(col).strip().replace(' ', '_')
            clean_col = ''.join(c for c in clean_col if c.isalnum() or c == '_')
            cleaned.append(clean_col)
        return cleaned
    
    def generate_preview(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate dataset preview"""
        preview = {
            'head': df.head(10).to_dict('records'),
            'tail': df.tail(10).to_dict('records'),
            'info': {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'memory_usage': f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB",
                'dtypes': df.dtypes.astype(str).to_dict(),
                'null_counts': df.isnull().sum().to_dict(),
                'null_percentages': (df.isnull().sum() / len(df) * 100).round(2).to_dict()
            }
        }
        return preview
    
    def handle_missing_values(self, df: pd.DataFrame, strategy: str = 'drop', 
                            columns: list = None) -> pd.DataFrame:
        """Handle missing values based on strategy"""
        if strategy == 'drop':
            if columns:
                df = df.dropna(subset=columns)
            else:
                df = df.dropna()
        elif strategy == 'impute_mean':
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            if columns:
                numeric_columns = [col for col in columns if col in numeric_columns]
            df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].mean())
        elif strategy == 'impute_median':
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            if columns:
                numeric_columns = [col for col in columns if col in numeric_columns]
            df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())
        elif strategy == 'impute_mode':
            if columns:
                for col in columns:
                    df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else df[col])
            else:
                for col in df.columns:
                    df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else df[col])
        
        return df
    
    def detect_outliers(self, df: pd.DataFrame, column: str, method: str = 'iqr') -> Dict[str, Any]:
        """Detect outliers using IQR or Z-score method"""
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        
        if not pd.api.types.is_numeric_dtype(df[column]):
            return {'outliers': [], 'method': method, 'message': 'Column is not numeric'}
        
        series = df[column].dropna()
        
        if method == 'iqr':
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = series[(series < lower_bound) | (series > upper_bound)]
        elif method == 'zscore':
            z_scores = np.abs((series - series.mean()) / series.std())
            outliers = series[z_scores > 3]
        else:
            raise ValueError("Method must be 'iqr' or 'zscore'")
        
        return {
            'outliers': outliers.tolist(),
            'outlier_count': len(outliers),
            'outlier_percentage': round(len(outliers) / len(series) * 100, 2),
            'method': method,
            'bounds': {
                'lower': lower_bound if method == 'iqr' else series.mean() - 3 * series.std(),
                'upper': upper_bound if method == 'iqr' else series.mean() + 3 * series.std()
            }
        }