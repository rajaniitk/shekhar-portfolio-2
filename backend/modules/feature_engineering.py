import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder, OneHotEncoder
from sklearn.feature_selection import SelectKBest, f_classif, f_regression, chi2
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

class FeatureEngineering:
    def __init__(self):
        self.transformation_history = {}
        self.encoders = {}
        self.scalers = {}
    
    def suggest_transformations(self, df: pd.DataFrame, target_column: str = None) -> dict:
        """Suggest appropriate transformations for each column"""
        suggestions = {}
        
        for col in df.columns:
            if col == target_column:
                continue
                
            col_suggestions = []
            
            if pd.api.types.is_numeric_dtype(df[col]):
                col_suggestions.extend(self._suggest_numeric_transformations(df[col]))
            elif pd.api.types.is_categorical_dtype(df[col]) or df[col].dtype == 'object':
                col_suggestions.extend(self._suggest_categorical_transformations(df[col]))
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                col_suggestions.extend(self._suggest_datetime_transformations(df[col]))
            
            suggestions[col] = col_suggestions
        
        return suggestions
    
    def _suggest_numeric_transformations(self, series: pd.Series) -> list:
        """Suggest transformations for numeric columns"""
        suggestions = []
        clean_series = series.dropna()
        
        if len(clean_series) == 0:
            return suggestions
        
        # Check skewness
        skewness = clean_series.skew()
        if abs(skewness) > 1:
            suggestions.append({
                'transformation': 'log_transform',
                'reason': f'High skewness ({skewness:.2f}). Log transformation may help normalize distribution.',
                'parameters': {}
            })
            
            if clean_series.min() <= 0:
                suggestions.append({
                    'transformation': 'box_cox',
                    'reason': 'Data contains non-positive values. Box-Cox with shift may be beneficial.',
                    'parameters': {}
                })
        
        # Check for outliers
        Q1 = clean_series.quantile(0.25)
        Q3 = clean_series.quantile(0.75)
        IQR = Q3 - Q1
        outliers = clean_series[(clean_series < Q1 - 1.5 * IQR) | (clean_series > Q3 + 1.5 * IQR)]
        
        if len(outliers) > 0.05 * len(clean_series):
            suggestions.append({
                'transformation': 'robust_scaling',
                'reason': f'High outlier percentage ({len(outliers)/len(clean_series)*100:.1f}%). Robust scaling recommended.',
                'parameters': {}
            })
        
        # Check range
        range_val = clean_series.max() - clean_series.min()
        if range_val > 1000:
            suggestions.append({
                'transformation': 'standard_scaling',
                'reason': f'Large range ({range_val:.2f}). Standardization may improve model performance.',
                'parameters': {}
            })
        
        # Suggest binning for continuous variables with many unique values
        if clean_series.nunique() > 50:
            suggestions.append({
                'transformation': 'binning',
                'reason': f'Many unique values ({clean_series.nunique()}). Binning may reduce complexity.',
                'parameters': {'n_bins': 10, 'strategy': 'quantile'}
            })
        
        return suggestions
    
    def _suggest_categorical_transformations(self, series: pd.Series) -> list:
        """Suggest transformations for categorical columns"""
        suggestions = []
        clean_series = series.dropna()
        
        if len(clean_series) == 0:
            return suggestions
        
        unique_count = clean_series.nunique()
        
        if unique_count == 2:
            suggestions.append({
                'transformation': 'label_encoding',
                'reason': 'Binary categorical variable. Label encoding is efficient.',
                'parameters': {}
            })
        elif unique_count <= 10:
            suggestions.append({
                'transformation': 'one_hot_encoding',
                'reason': f'Low cardinality ({unique_count} categories). One-hot encoding recommended.',
                'parameters': {}
            })
        else:
            suggestions.append({
                'transformation': 'frequency_encoding',
                'reason': f'High cardinality ({unique_count} categories). Frequency encoding may be better than one-hot.',
                'parameters': {}
            })
            
            # Suggest grouping rare categories
            value_counts = clean_series.value_counts()
            rare_categories = value_counts[value_counts < 0.01 * len(clean_series)]
            if len(rare_categories) > 0:
                suggestions.append({
                    'transformation': 'group_rare_categories',
                    'reason': f'{len(rare_categories)} rare categories found. Grouping may improve model performance.',
                    'parameters': {'threshold': 0.01}
                })
        
        return suggestions
    
    def _suggest_datetime_transformations(self, series: pd.Series) -> list:
        """Suggest transformations for datetime columns"""
        suggestions = [
            {
                'transformation': 'extract_datetime_features',
                'reason': 'Datetime column detected. Extract year, month, day, etc.',
                'parameters': {'features': ['year', 'month', 'day', 'dayofweek', 'hour']}
            },
            {
                'transformation': 'cyclical_encoding',
                'reason': 'Cyclical encoding for temporal features may capture seasonality better.',
                'parameters': {'features': ['month', 'dayofweek', 'hour']}
            }
        ]
        
        return suggestions
    
    def apply_transformation(self, df: pd.DataFrame, column: str, transformation: str, 
                           parameters: dict = None) -> tuple:
        """Apply specified transformation to a column"""
        if parameters is None:
            parameters = {}
        
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        
        transformation_method = getattr(self, f"_{transformation}", None)
        if transformation_method is None:
            raise ValueError(f"Transformation '{transformation}' not available")
        
        try:
            transformed_df = df.copy()
            transformation_info = transformation_method(transformed_df, column, **parameters)
            
            # Store transformation history
            if column not in self.transformation_history:
                self.transformation_history[column] = []
            
            self.transformation_history[column].append({
                'transformation': transformation,
                'parameters': parameters,
                'info': transformation_info
            })
            
            return transformed_df, transformation_info
            
        except Exception as e:
            raise Exception(f"Error applying transformation '{transformation}': {str(e)}")
    
    def _log_transform(self, df: pd.DataFrame, column: str, **kwargs) -> dict:
        """Apply log transformation"""
        original_series = df[column].copy()
        
        # Handle non-positive values
        if original_series.min() <= 0:
            shift = abs(original_series.min()) + 1
            df[column] = np.log(original_series + shift)
            transformation_info = {
                'method': 'log_transform_with_shift',
                'shift_value': shift,
                'original_range': [original_series.min(), original_series.max()],
                'transformed_range': [df[column].min(), df[column].max()]
            }
        else:
            df[column] = np.log(original_series)
            transformation_info = {
                'method': 'log_transform',
                'original_range': [original_series.min(), original_series.max()],
                'transformed_range': [df[column].min(), df[column].max()]
            }
        
        return transformation_info
    
    def _box_cox(self, df: pd.DataFrame, column: str, **kwargs) -> dict:
        """Apply Box-Cox transformation"""
        original_series = df[column].copy()
        
        # Handle non-positive values
        if original_series.min() <= 0:
            shift = abs(original_series.min()) + 1
            shifted_series = original_series + shift
        else:
            shifted_series = original_series
            shift = 0
        
        try:
            transformed_data, lambda_param = stats.boxcox(shifted_series.dropna())
            df[column] = transformed_data
            
            transformation_info = {
                'method': 'box_cox',
                'lambda': lambda_param,
                'shift_value': shift,
                'original_range': [original_series.min(), original_series.max()],
                'transformed_range': [df[column].min(), df[column].max()]
            }
        except Exception as e:
            # Fallback to log transform if Box-Cox fails
            df[column] = np.log(shifted_series)
            transformation_info = {
                'method': 'log_transform_fallback',
                'reason': f'Box-Cox failed: {str(e)}',
                'shift_value': shift,
                'original_range': [original_series.min(), original_series.max()],
                'transformed_range': [df[column].min(), df[column].max()]
            }
        
        return transformation_info
    
    def _standard_scaling(self, df: pd.DataFrame, column: str, **kwargs) -> dict:
        """Apply standard scaling (z-score normalization)"""
        original_series = df[column].copy()
        
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(original_series.values.reshape(-1, 1))
        df[column] = scaled_data.flatten()
        
        # Store scaler for potential inverse transform
        self.scalers[f"{column}_standard"] = scaler
        
        transformation_info = {
            'method': 'standard_scaling',
            'mean': scaler.mean_[0],
            'std': scaler.scale_[0],
            'original_range': [original_series.min(), original_series.max()],
            'transformed_range': [df[column].min(), df[column].max()]
        }
        
        return transformation_info
    
    def _min_max_scaling(self, df: pd.DataFrame, column: str, feature_range: tuple = (0, 1), **kwargs) -> dict:
        """Apply min-max scaling"""
        original_series = df[column].copy()
        
        scaler = MinMaxScaler(feature_range=feature_range)
        scaled_data = scaler.fit_transform(original_series.values.reshape(-1, 1))
        df[column] = scaled_data.flatten()
        
        # Store scaler for potential inverse transform
        self.scalers[f"{column}_minmax"] = scaler
        
        transformation_info = {
            'method': 'min_max_scaling',
            'feature_range': feature_range,
            'original_range': [original_series.min(), original_series.max()],
            'transformed_range': [df[column].min(), df[column].max()]
        }
        
        return transformation_info
    
    def _robust_scaling(self, df: pd.DataFrame, column: str, **kwargs) -> dict:
        """Apply robust scaling (using median and IQR)"""
        original_series = df[column].copy()
        
        scaler = RobustScaler()
        scaled_data = scaler.fit_transform(original_series.values.reshape(-1, 1))
        df[column] = scaled_data.flatten()
        
        # Store scaler for potential inverse transform
        self.scalers[f"{column}_robust"] = scaler
        
        transformation_info = {
            'method': 'robust_scaling',
            'median': scaler.center_[0],
            'iqr': scaler.scale_[0],
            'original_range': [original_series.min(), original_series.max()],
            'transformed_range': [df[column].min(), df[column].max()]
        }
        
        return transformation_info
    
    def _binning(self, df: pd.DataFrame, column: str, n_bins: int = 10, 
                strategy: str = 'quantile', **kwargs) -> dict:
        """Apply binning to continuous variables"""
        original_series = df[column].copy()
        
        if strategy == 'quantile':
            df[f"{column}_binned"] = pd.qcut(original_series, q=n_bins, labels=False, duplicates='drop')
        elif strategy == 'uniform':
            df[f"{column}_binned"] = pd.cut(original_series, bins=n_bins, labels=False)
        else:
            raise ValueError("Strategy must be 'quantile' or 'uniform'")
        
        # Create bin labels
        bin_edges = pd.cut(original_series, bins=n_bins, retbins=True)[1]
        bin_labels = [f"Bin_{i}" for i in range(len(bin_edges)-1)]
        
        transformation_info = {
            'method': 'binning',
            'strategy': strategy,
            'n_bins': n_bins,
            'bin_edges': bin_edges.tolist(),
            'bin_labels': bin_labels,
            'new_column': f"{column}_binned"
        }
        
        return transformation_info
    
    def _label_encoding(self, df: pd.DataFrame, column: str, **kwargs) -> dict:
        """Apply label encoding to categorical variables"""
        original_series = df[column].copy()
        
        encoder = LabelEncoder()
        df[column] = encoder.fit_transform(original_series.astype(str))
        
        # Store encoder for potential inverse transform
        self.encoders[f"{column}_label"] = encoder
        
        transformation_info = {
            'method': 'label_encoding',
            'classes': encoder.classes_.tolist(),
            'mapping': {cls: idx for idx, cls in enumerate(encoder.classes_)}
        }
        
        return transformation_info
    
    def _one_hot_encoding(self, df: pd.DataFrame, column: str, **kwargs) -> dict:
        """Apply one-hot encoding to categorical variables"""
        original_series = df[column].copy()
        
        # Create dummy variables
        dummy_vars = pd.get_dummies(original_series, prefix=column, dummy_na=False)
        
        # Add dummy variables to dataframe
        for col in dummy_vars.columns:
            df[col] = dummy_vars[col]
        
        # Drop original column
        df.drop(column, axis=1, inplace=True)
        
        transformation_info = {
            'method': 'one_hot_encoding',
            'new_columns': dummy_vars.columns.tolist(),
            'dropped_column': column,
            'categories': original_series.unique().tolist()
        }
        
        return transformation_info
    
    def _frequency_encoding(self, df: pd.DataFrame, column: str, **kwargs) -> dict:
        """Apply frequency encoding to categorical variables"""
        original_series = df[column].copy()
        
        # Calculate frequency of each category
        frequency_map = original_series.value_counts().to_dict()
        
        # Apply frequency encoding
        df[f"{column}_freq"] = original_series.map(frequency_map)
        
        transformation_info = {
            'method': 'frequency_encoding',
            'frequency_map': frequency_map,
            'new_column': f"{column}_freq"
        }
        
        return transformation_info
    
    def _group_rare_categories(self, df: pd.DataFrame, column: str, threshold: float = 0.01, **kwargs) -> dict:
        """Group rare categories into 'Other' category"""
        original_series = df[column].copy()
        
        # Calculate frequency of each category
        value_counts = original_series.value_counts()
        rare_categories = value_counts[value_counts < threshold * len(original_series)].index.tolist()
        
        # Replace rare categories with 'Other'
        df[column] = original_series.replace(rare_categories, 'Other')
        
        transformation_info = {
            'method': 'group_rare_categories',
            'threshold': threshold,
            'rare_categories': rare_categories,
            'n_rare_categories': len(rare_categories),
            'categories_after_grouping': df[column].unique().tolist()
        }
        
        return transformation_info
    
    def _extract_datetime_features(self, df: pd.DataFrame, column: str, 
                                  features: list = None, **kwargs) -> dict:
        """Extract features from datetime columns"""
        if features is None:
            features = ['year', 'month', 'day', 'dayofweek', 'hour']
        
        datetime_series = pd.to_datetime(df[column])
        new_columns = []
        
        for feature in features:
            if feature == 'year':
                df[f"{column}_year"] = datetime_series.dt.year
                new_columns.append(f"{column}_year")
            elif feature == 'month':
                df[f"{column}_month"] = datetime_series.dt.month
                new_columns.append(f"{column}_month")
            elif feature == 'day':
                df[f"{column}_day"] = datetime_series.dt.day
                new_columns.append(f"{column}_day")
            elif feature == 'dayofweek':
                df[f"{column}_dayofweek"] = datetime_series.dt.dayofweek
                new_columns.append(f"{column}_dayofweek")
            elif feature == 'hour':
                df[f"{column}_hour"] = datetime_series.dt.hour
                new_columns.append(f"{column}_hour")
        
        transformation_info = {
            'method': 'extract_datetime_features',
            'extracted_features': features,
            'new_columns': new_columns
        }
        
        return transformation_info
    
    def _cyclical_encoding(self, df: pd.DataFrame, column: str, 
                          features: list = None, **kwargs) -> dict:
        """Apply cyclical encoding to temporal features"""
        if features is None:
            features = ['month', 'dayofweek', 'hour']
        
        datetime_series = pd.to_datetime(df[column])
        new_columns = []
        
        for feature in features:
            if feature == 'month':
                df[f"{column}_month_sin"] = np.sin(2 * np.pi * datetime_series.dt.month / 12)
                df[f"{column}_month_cos"] = np.cos(2 * np.pi * datetime_series.dt.month / 12)
                new_columns.extend([f"{column}_month_sin", f"{column}_month_cos"])
            elif feature == 'dayofweek':
                df[f"{column}_dayofweek_sin"] = np.sin(2 * np.pi * datetime_series.dt.dayofweek / 7)
                df[f"{column}_dayofweek_cos"] = np.cos(2 * np.pi * datetime_series.dt.dayofweek / 7)
                new_columns.extend([f"{column}_dayofweek_sin", f"{column}_dayofweek_cos"])
            elif feature == 'hour':
                df[f"{column}_hour_sin"] = np.sin(2 * np.pi * datetime_series.dt.hour / 24)
                df[f"{column}_hour_cos"] = np.cos(2 * np.pi * datetime_series.dt.hour / 24)
                new_columns.extend([f"{column}_hour_sin", f"{column}_hour_cos"])
        
        transformation_info = {
            'method': 'cyclical_encoding',
            'encoded_features': features,
            'new_columns': new_columns
        }
        
        return transformation_info
    
    def create_polynomial_features(self, df: pd.DataFrame, columns: list, degree: int = 2) -> tuple:
        """Create polynomial features"""
        from sklearn.preprocessing import PolynomialFeatures
        
        if not all(col in df.columns for col in columns):
            raise ValueError("One or more columns not found in DataFrame")
        
        # Select only numeric columns
        numeric_cols = [col for col in columns if pd.api.types.is_numeric_dtype(df[col])]
        
        if not numeric_cols:
            raise ValueError("No numeric columns found for polynomial features")
        
        poly = PolynomialFeatures(degree=degree, include_bias=False)
        poly_features = poly.fit_transform(df[numeric_cols])
        
        # Create column names
        feature_names = poly.get_feature_names_out(numeric_cols)
        
        # Create new dataframe with polynomial features
        poly_df = pd.DataFrame(poly_features, columns=feature_names, index=df.index)
        
        # Combine with original dataframe (excluding original columns to avoid duplication)
        result_df = df.drop(columns=numeric_cols).join(poly_df)
        
        transformation_info = {
            'method': 'polynomial_features',
            'degree': degree,
            'original_columns': numeric_cols,
            'new_columns': feature_names.tolist(),
            'n_features_created': len(feature_names)
        }
        
        return result_df, transformation_info
    
    def feature_selection(self, df: pd.DataFrame, target_column: str, 
                         method: str = 'k_best', k: int = 10) -> tuple:
        """Perform feature selection"""
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found")
        
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Remove non-numeric columns for feature selection
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        X_numeric = X[numeric_cols]
        
        if len(X_numeric.columns) == 0:
            raise ValueError("No numeric columns found for feature selection")
        
        # Determine if it's classification or regression
        if pd.api.types.is_numeric_dtype(y) and y.nunique() > 10:
            score_func = f_regression
            problem_type = 'regression'
        else:
            score_func = f_classif
            problem_type = 'classification'
        
        if method == 'k_best':
            selector = SelectKBest(score_func=score_func, k=min(k, len(X_numeric.columns)))
        else:
            raise ValueError(f"Method '{method}' not supported")
        
        X_selected = selector.fit_transform(X_numeric, y)
        selected_columns = X_numeric.columns[selector.get_support()].tolist()
        
        # Create result dataframe
        result_df = df[selected_columns + [target_column]]
        
        # Get feature scores
        feature_scores = dict(zip(X_numeric.columns, selector.scores_))
        selected_scores = {col: feature_scores[col] for col in selected_columns}
        
        selection_info = {
            'method': method,
            'problem_type': problem_type,
            'k': k,
            'selected_columns': selected_columns,
            'feature_scores': selected_scores,
            'n_features_before': len(X_numeric.columns),
            'n_features_after': len(selected_columns)
        }
        
        return result_df, selection_info